# SeekATS Azure Infrastructure Setup (Run Once)
# This script prepares the Azure environment for the GitHub Actions pipeline.

$RESOURCE_GROUP = "seekats-rg"
$LOCATION = "eastus"
$SUFFIX = Get-Random -Maximum 9999
$ACR_NAME = "seekatsacr$SUFFIX"
$APP_SERVICE_PLAN = "seekats-plan"
$WEB_APP_NAME = "seekats-app-$SUFFIX"
$STORAGE_ACCOUNT = "seekatsstore$SUFFIX"
$FILE_SHARE = "seekatsdata"
$APP_SKU = "F1" # Free tier

Write-Host "--- 1. Creating Resource Group ---" -ForegroundColor Cyan
az group create --name $RESOURCE_GROUP --location $LOCATION

Write-Host "--- 2. Creating Azure Container Registry ($ACR_NAME) ---" -ForegroundColor Cyan
az acr create --resource-group $RESOURCE_GROUP --name $ACR_NAME --sku Basic --admin-enabled true
$ACR_LOGIN_SERVER = (az acr show --name $ACR_NAME --query "loginServer" -o tsv)
$ACR_USER = (az acr credential show --name $ACR_NAME --query "username" -o tsv)
$ACR_PASS = (az acr credential show --name $ACR_NAME --query "passwords[0].value" -o tsv)

Write-Host "--- 3. Creating App Service Plan ($APP_SKU) ---" -ForegroundColor Cyan
az appservice plan create --name $APP_SERVICE_PLAN --resource-group $RESOURCE_GROUP --is-linux --sku $APP_SKU

Write-Host "--- 4. Creating Web App (Initial Placeholder) ---" -ForegroundColor Cyan
# Initial deploy with a hello-world image just to create the resource
az webapp create --resource-group $RESOURCE_GROUP --plan $APP_SERVICE_PLAN --name $WEB_APP_NAME --deployment-container-image-name "mcr.microsoft.com/azuredocs/container-apps-helloworld:latest"

Write-Host "--- 5. Setting up Persistent Storage ($STORAGE_ACCOUNT) ---" -ForegroundColor Cyan
az storage account create --name $STORAGE_ACCOUNT --resource-group $RESOURCE_GROUP --location $LOCATION --sku Standard_LRS
$STORAGE_KEY = (az storage account keys list --resource-group $RESOURCE_GROUP --account-name $STORAGE_ACCOUNT --query "[0].value" -o tsv)
az storage share create --name $FILE_SHARE --account-name $STORAGE_ACCOUNT --account-key $STORAGE_KEY

Write-Host "--- 6. Mapping Storage to Container ---" -ForegroundColor Cyan
az webapp config storage-account add --resource-group $RESOURCE_GROUP --name $WEB_APP_NAME --custom-id "seekats-data-mount" --storage-type AzureFiles --share-name $FILE_SHARE --account-name $STORAGE_ACCOUNT --access-key $STORAGE_KEY --mount-path "/data"

Write-Host "--- 7. Generating GitHub Service Principal Credentials ---" -ForegroundColor Cyan
$subId = (az account show --query "id" -o tsv)
$spJson = (az ad sp create-for-rbac --name "seekats-github-deploy" --role contributor --scopes "/subscriptions/$subId/resourceGroups/$RESOURCE_GROUP" --sdk-auth)

Write-Host "--- INFRASTRUCTURE READY ---" -ForegroundColor Green
Write-Host "`nAdd these as SECRETS in GitHub (Settings > Secrets > Actions):" -ForegroundColor Yellow
Write-Host "ACR_LOGIN_SERVER: $ACR_LOGIN_SERVER"
Write-Host "ACR_USERNAME: $ACR_USER"
Write-Host "ACR_PASSWORD: $ACR_PASS"
Write-Host "AZURE_WEBAPP_NAME: $WEB_APP_NAME"
Write-Host "AZURE_CREDENTIALS: (Copy the JSON below)" -ForegroundColor Yellow
Write-Host $spJson
