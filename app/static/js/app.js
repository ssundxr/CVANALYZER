const form = document.getElementById("jobForm");

if (form) {
    const referenceData = JSON.parse(document.getElementById("referenceData").textContent);
    const assessmentDefaults = JSON.parse(document.getElementById("assessmentDefaults").textContent);
    const toast = document.getElementById("toast");
    const questionPlanBody = document.getElementById("questionPlanBody");
    const educationContainer = document.getElementById("educationContainer");
    const customQuestionContainer = document.getElementById("customQuestionContainer");

    initialize();

    function initialize() {
        initializeEditors();
        populateStaticFields();
        wireLocationHierarchy();
        renderChipGroup("screeningFields", referenceData.screening_fields, assessmentDefaults.screening_fields);
        renderChipGroup("knowledgeSources", referenceData.knowledge_sources, assessmentDefaults.knowledge_sources);
        renderChipGroup("assessmentGoals", referenceData.assessment_goals, assessmentDefaults.goals);
        renderChipGroup("competencies", referenceData.competencies, assessmentDefaults.competencies);
        renderChipGroup("deliveryRules", referenceData.delivery_rules, assessmentDefaults.delivery_rules);
        renderQuestionPlan(assessmentDefaults.question_plan);
        addEducationEntry();
        addCustomQuestionEntry();
        setDefaultDates();
        bindActions();
        recalculateTotals();
    }

    function initializeEditors() {
        document.querySelectorAll("[data-editor-root]").forEach((shell) => {
            const editor = shell.querySelector(".rich-editor, [contenteditable='true'][data-target]");
            if (!editor) {
                return;
            }
            const targetId = editor.dataset.target;
            const hidden = document.getElementById(targetId);
            if (!hidden) {
                return;
            }

            shell.querySelectorAll("[data-command]").forEach((button) => {
                button.addEventListener("click", () => {
                    editor.focus();
                    document.execCommand(button.dataset.command, false, null);
                    syncEditor(editor, hidden);
                });
            });

            editor.addEventListener("input", () => syncEditor(editor, hidden));
            syncEditor(editor, hidden);
        });
    }

    function syncEditor(editor, hidden) {
        hidden.value = editor.innerHTML.trim();
    }

    function populateStaticFields() {
        populateSelect("companyType", referenceData.company_types);
        populateSelect("companyName", referenceData.companies);
        populateSelect("jobType", referenceData.job_types);
        populateSelect("jobLocationType", referenceData.job_locations);
        populateSelect("industry", referenceData.industries);
        populateSelect("subIndustry", referenceData.sub_industries);
        populateSelect("functionalArea", referenceData.functional_areas);
        populateSelect("designation", referenceData.designations);
        populateSelect("currency", referenceData.currencies, { placeholder: "Select currency" });
        populateSelect("nationality", referenceData.nationalities, { placeholder: "Select nationality" });
        populateSelect("languagesKnown", referenceData.languages, { multiple: true });
        populateSelect("preferredCountries", referenceData.countries, { multiple: true });
        populateSelect("preferredStates", referenceData.states, { multiple: true });
        populateSelect("preferredCities", referenceData.cities, { multiple: true });
        populateSelect("availability", referenceData.availability_options, { placeholder: "Select availability" });
        populateSelect("visaStatus", referenceData.visa_statuses, { placeholder: "Select visa status" });
        populateSelect("experienceIndustry", referenceData.industries, { placeholder: "Select industry" });
        populateSelect("experienceSubIndustry", referenceData.sub_industries, { placeholder: "Select sub industry" });
        populateSelect("functionalSkills", referenceData.functional_skills, { multiple: true });
        populateSelect("professionalSkills", referenceData.professional_skills, { multiple: true });
        populateSelect("itSkills", referenceData.it_skills, { multiple: true });
        populateSelect("applicationMode", referenceData.application_modes, { placeholder: "Select mode" });
        populateSelect("difficulty", referenceData.difficulties, { selected: [assessmentDefaults.difficulty] });
        document.getElementById("assessmentName").value = assessmentDefaults.assessment_name;
    }

    function wireLocationHierarchy() {
        const countrySelect = document.getElementById("jobCountry");
        const stateSelect = document.getElementById("jobState");
        const citySelect = document.getElementById("jobCity");
        const hierarchy = referenceData.location_hierarchy;

        populateSelect("jobCountry", referenceData.countries);
        updateStateOptions();
        updateCityOptions();

        countrySelect.addEventListener("change", () => {
            updateStateOptions();
            updateCityOptions();
        });

        stateSelect.addEventListener("change", updateCityOptions);

        function updateStateOptions() {
            const states = Object.keys(hierarchy[countrySelect.value] || {});
            stateSelect.innerHTML = buildOptions(states, states[0], {
                multiple: false,
                placeholder: states.length ? null : "No state available",
                selectedValues: new Set(),
            });
        }

        function updateCityOptions() {
            const cities = (hierarchy[countrySelect.value] || {})[stateSelect.value] || [];
            citySelect.innerHTML = buildOptions(cities, cities[0], {
                multiple: false,
                placeholder: cities.length ? null : "No city available",
                selectedValues: new Set(),
            });
        }
    }

    function populateSelect(id, options, config = {}) {
        const element = document.getElementById(id);
        if (!element) {
            return;
        }

        const selectedValues = new Set(config.selected || []);
        const multiple = Boolean(config.multiple);
        element.multiple = multiple;
        element.innerHTML = buildOptions(options || [], null, {
            multiple,
            placeholder: config.placeholder,
            selectedValues,
        });
    }

    function buildOptions(options, fallbackValue, config = {}) {
        const values = options || [];
        const selectedValues = config.selectedValues || new Set();
        const rows = [];

        if (config.placeholder && !config.multiple) {
            rows.push(`<option value="">${escapeHtml(config.placeholder)}</option>`);
        }

        values.forEach((item, index) => {
            const value = typeof item === "string" ? item : item.key || item.value || item.label;
            const label = typeof item === "string" ? item : item.label || item.name || item.value;
            const shouldSelectFirst = !selectedValues.size && !config.placeholder && !config.multiple && index === 0;
            const isSelected = selectedValues.has(value) || (!selectedValues.size && fallbackValue === value) || shouldSelectFirst;
            rows.push(`<option value="${escapeHtml(value)}" ${isSelected ? "selected" : ""}>${escapeHtml(label)}</option>`);
        });

        return rows.join("");
    }

    function renderChipGroup(containerId, items, selectedValues = []) {
        const container = document.getElementById(containerId);
        const selected = new Set(selectedValues);
        container.innerHTML = items.map((item) => {
            const checked = selected.has(item.key) ? "checked" : "";
            return `
                <label class="chip-option">
                    <input type="checkbox" value="${escapeHtml(item.key)}" ${checked}>
                    <span>${escapeHtml(item.label)}</span>
                </label>
            `;
        }).join("");
    }

    function renderQuestionPlan(plan) {
        questionPlanBody.innerHTML = plan.map((item) => `
            <tr data-key="${escapeHtml(item.key)}">
                <td>
                    <strong>${escapeHtml(item.label)}</strong>
                </td>
                <td><input type="number" class="plan-count" min="0" value="${item.default_count}"></td>
                <td><input type="number" class="plan-minutes" min="0" step="0.5" value="${item.default_minutes}"></td>
                <td><input type="number" class="plan-weight" min="0" step="0.5" value="${item.default_weight}"></td>
                <td class="plan-total">0</td>
            </tr>
        `).join("");

        questionPlanBody.querySelectorAll("input").forEach((input) => {
            input.addEventListener("input", recalculateTotals);
        });
    }

    function addEducationEntry(values = {}) {
        const block = document.createElement("article");
        block.className = "bg-white border border-slate-200 rounded-xl p-5 shadow-sm";
        block.innerHTML = `
            <div class="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
                <h3 class="text-sm font-bold text-slate-900">Education Requirement</h3>
                <button class="remove-link text-xs font-semibold text-red-600 hover:text-red-800" type="button">Remove</button>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium text-slate-700 mb-1">Qualification</label>
                    <select class="education-qualifications block w-full rounded-md border-slate-300 py-2 px-3 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 border min-h-[100px]" multiple></select>
                </div>
                <div class="flex items-center pt-6">
                    <input type="checkbox" class="education-mandatory h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900" ${values.mandatory ? "checked" : ""}>
                    <label class="ml-2 block text-sm text-slate-700">Mandatory Criteria</label>
                </div>
                <div>
                    <label class="block text-sm font-medium text-slate-700 mb-1">Course</label>
                    <select class="education-course block w-full rounded-md border-slate-300 py-2 px-3 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 border"></select>
                </div>
                <div>
                    <label class="block text-sm font-medium text-slate-700 mb-1">Specialization</label>
                    <select class="education-specialization block w-full rounded-md border-slate-300 py-2 px-3 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 border"></select>
                </div>
            </div>
        `;

        educationContainer.appendChild(block);
        populateInnerSelect(block.querySelector(".education-qualifications"), referenceData.qualifications, {
            multiple: true,
            selected: values.qualifications || [],
        });
        populateInnerSelect(block.querySelector(".education-course"), referenceData.courses, {
            placeholder: "Select course",
            selected: values.course ? [values.course] : [],
        });
        populateInnerSelect(block.querySelector(".education-specialization"), referenceData.specializations, {
            placeholder: "Select specialization",
            selected: values.specialization ? [values.specialization] : [],
        });
        block.querySelector(".remove-link").addEventListener("click", () => block.remove());
    }

    function addCustomQuestionEntry(value = "") {
        if (customQuestionContainer.children.length >= referenceData.custom_question_limit) {
            showToast(`You can add up to ${referenceData.custom_question_limit} custom questions.`);
            return;
        }

        const block = document.createElement("article");
        block.className = "bg-white border border-slate-200 rounded-xl p-5 shadow-sm";
        block.innerHTML = `
            <div class="flex justify-between items-center mb-3">
                <h3 class="text-sm font-bold text-slate-900">Candidate Question</h3>
                <button class="remove-link text-xs font-semibold text-red-600 hover:text-red-800" type="button">Remove</button>
            </div>
            <div>
                <label class="sr-only">Question</label>
                <textarea class="custom-question-input block w-full rounded-md border-slate-300 py-2 px-3 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 border" rows="3" placeholder="Enter a screening or clarifying question."></textarea>
            </div>
        `;

        block.querySelector(".custom-question-input").value = value;
        customQuestionContainer.appendChild(block);
        block.querySelector(".remove-link").addEventListener("click", () => block.remove());
    }

    function populateInnerSelect(element, options, config = {}) {
        element.multiple = Boolean(config.multiple);
        element.innerHTML = buildOptions(options || [], null, {
            multiple: config.multiple,
            placeholder: config.placeholder,
            selectedValues: new Set(config.selected || []),
        });
    }

    function bindActions() {
        document.getElementById("addEducationBtn").addEventListener("click", () => addEducationEntry());
        document.getElementById("addQuestionBtn").addEventListener("click", () => addCustomQuestionEntry());
        document.getElementById("copyPayloadBtn").addEventListener("click", copyPayload);
        document.getElementById("resetButton").addEventListener("click", () => window.location.reload());

        document.querySelectorAll("[data-submit-status]").forEach((button) => {
            button.addEventListener("click", () => submitForm(button.dataset.submitStatus, button));
        });
    }

    function setDefaultDates() {
        const expiry = document.getElementById("expiryDate");
        const target = new Date();
        target.setDate(target.getDate() + 30);
        expiry.value = target.toISOString().split("T")[0];
    }

    function recalculateTotals() {
        let totalQuestions = 0;
        let totalMinutes = 0;
        let totalWeight = 0;

        questionPlanBody.querySelectorAll("tr").forEach((row) => {
            const count = numberValue(row.querySelector(".plan-count").value);
            const minutes = numberValue(row.querySelector(".plan-minutes").value);
            const weight = numberValue(row.querySelector(".plan-weight").value);
            const rowTotal = roundNumber(count * minutes);
            totalQuestions += count;
            totalMinutes += rowTotal;
            totalWeight += weight;
            row.querySelector(".plan-total").textContent = rowTotal.toFixed(1).replace(/\.0$/, "");
        });

        document.getElementById("questionTotal").textContent = String(totalQuestions);
        document.getElementById("timeTotal").textContent = totalMinutes.toFixed(1).replace(/\.0$/, "");
        document.getElementById("weightTotal").textContent = `${roundNumber(totalWeight).toFixed(0)}%`;
    }

    async function submitForm(status, button) {
        syncAllEditors();
        document.getElementById("statusInput").value = status;
        document.getElementById("statusBadge").textContent = status === "published" ? "Published" : "Draft";

        if (!form.reportValidity()) {
            showToast("Please complete the required fields first.");
            return;
        }

        recalculateTotals();
        const payload = collectPayload(status);
        const requestBody = new FormData();
        requestBody.append("payload", JSON.stringify(payload));

        const companyLogo = document.getElementById("companyLogo").files[0];
        if (companyLogo) {
            requestBody.append("company_logo", companyLogo);
        }

        Array.from(document.getElementById("jobPhotos").files).forEach((file) => {
            requestBody.append("job_photos", file);
        });

        try {
            setSubmitting(button, true);
            const response = await fetch("/api/jobs", {
                method: "POST",
                body: requestBody,
                credentials: "same-origin",
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.detail || "Unable to save the job.");
            }

            document.getElementById("payloadOutput").textContent = JSON.stringify(data.assessment_payload, null, 2);
            document.getElementById("generatedRefs").innerHTML = `
                <span>Saved successfully</span>
                <strong>Job No: ${escapeHtml(data.job.job_number)}</strong>
                <strong>Assessment No: ${escapeHtml(data.job.assessment_number)}</strong>
            `;
            showToast(status === "published" ? "Job posted and payload generated." : "Draft saved and payload generated.");
        } catch (error) {
            showToast(error.message || "Something went wrong while saving.");
        } finally {
            setSubmitting(button, false);
        }
    }

    function collectPayload(status) {
        return {
            status,
            employer_details: {
                type_of_company: fieldValue("companyType"),
                company_name: fieldValue("companyName"),
                publish_this_job: document.getElementById("publishJob").checked,
                expiry_date: fieldValue("expiryDate"),
            },
            job_details: {
                job_title: fieldValue("jobTitle"),
                job_type: fieldValue("jobType"),
                job_location_type: fieldValue("jobLocationType"),
                industry: fieldValue("industry"),
                sub_industry: fieldValue("subIndustry"),
                functional_area: fieldValue("functionalArea"),
                designation: fieldValue("designation"),
                roles_and_responsibilities: fieldValue("rolesResponsibilities"),
                desired_candidate_profile: fieldValue("desiredCandidateProfile"),
                keywords: splitKeywords(fieldValue("keywords")),
                number_of_vacancies: numberValue(fieldValue("vacancies")),
                country: fieldValue("jobCountry"),
                state: fieldValue("jobState"),
                city: fieldValue("jobCity"),
            },
            salary_details: {
                currency: fieldValue("currency"),
                minimum_salary: numberValue(fieldValue("minimumSalary"), true),
                maximum_salary: numberValue(fieldValue("maximumSalary"), true),
                hide_salary_from_job_seekers: document.getElementById("hideSalary").checked,
                other_benefits: fieldValue("otherBenefits"),
            },
            candidate_profile: {
                gender: fieldValue("gender"),
                age_range: {
                    min: numberValue(fieldValue("minAge"), true),
                    max: numberValue(fieldValue("maxAge"), true),
                },
                nationality: fieldValue("nationality"),
                preferred_countries: selectedValues("preferredCountries"),
                preferred_states: selectedValues("preferredStates"),
                preferred_cities: selectedValues("preferredCities"),
                languages_known: selectedValues("languagesKnown"),
                driving_license: fieldValue("drivingLicense"),
                availability: fieldValue("availability"),
                visa_status: fieldValue("visaStatus"),
            },
            experience_requirement: {
                industry: fieldValue("experienceIndustry"),
                sub_industry: fieldValue("experienceSubIndustry"),
                work_experience_years: {
                    min: numberValue(fieldValue("minExperience"), true),
                    max: numberValue(fieldValue("maxExperience"), true),
                },
                gcc_experience_years: {
                    min: numberValue(fieldValue("minGccExperience"), true),
                    max: numberValue(fieldValue("maxGccExperience"), true),
                },
            },
            education_requirements: Array.from(educationContainer.children).map((card) => ({
                qualifications: selectedValuesFromElement(card.querySelector(".education-qualifications")),
                mandatory: card.querySelector(".education-mandatory").checked,
                course: card.querySelector(".education-course").value,
                specialization: card.querySelector(".education-specialization").value,
            })),
            skills_requirement: {
                functional_skills: selectedValues("functionalSkills"),
                professional_skills: selectedValues("professionalSkills"),
                it_skills: selectedValues("itSkills"),
            },
            custom_questions: Array.from(document.querySelectorAll(".custom-question-input"))
                .map((input) => input.value.trim())
                .filter(Boolean),
            recruiter_instructions: fieldValue("recruiterInstructions"),
            application_mode: fieldValue("applicationMode"),
            assessment_config: {
                assessment_name: fieldValue("assessmentName"),
                screening_fields: checkedValues("screeningFields"),
                knowledge_sources: checkedValues("knowledgeSources"),
                goals: checkedValues("assessmentGoals"),
                difficulty: fieldValue("difficulty"),
                competencies: checkedValues("competencies"),
                delivery_rules: checkedValues("deliveryRules"),
                question_plan: Array.from(questionPlanBody.querySelectorAll("tr")).map((row) => ({
                    key: row.dataset.key,
                    label: row.querySelector("strong").textContent.trim(),
                    count: numberValue(row.querySelector(".plan-count").value),
                    minutes_per_question: numberValue(row.querySelector(".plan-minutes").value),
                    weight: numberValue(row.querySelector(".plan-weight").value),
                })),
            },
        };
    }

    function copyPayload() {
        const payload = document.getElementById("payloadOutput").textContent.trim();
        if (!payload || payload.startsWith("Save a job")) {
            showToast("Generate a payload first.");
            return;
        }
        navigator.clipboard.writeText(payload).then(() => showToast("Payload copied to clipboard."));
    }

    function syncAllEditors() {
        document.querySelectorAll(".rich-editor, [contenteditable='true'][data-target]").forEach((editor) => {
            const hidden = document.getElementById(editor.dataset.target);
            if (hidden) {
                syncEditor(editor, hidden);
            }
        });
    }

    function checkedValues(containerId) {
        return Array.from(document.querySelectorAll(`#${containerId} input:checked`)).map((input) => input.value);
    }

    function fieldValue(id) {
        return document.getElementById(id).value.trim();
    }

    function selectedValues(id) {
        return selectedValuesFromElement(document.getElementById(id));
    }

    function selectedValuesFromElement(element) {
        return Array.from(element.selectedOptions).map((option) => option.value).filter(Boolean);
    }

    function splitKeywords(value) {
        return value.split(",").map((part) => part.trim()).filter(Boolean);
    }

    function setSubmitting(button, isSubmitting) {
        document.querySelectorAll("[data-submit-status]").forEach((action) => {
            action.disabled = isSubmitting;
        });
        button.textContent = isSubmitting ? "Saving..." : (button.dataset.submitStatus === "published" ? "Post Job" : "Save as Draft");
    }

    function showToast(message) {
        toast.textContent = message;
        toast.classList.add("is-visible");
        window.clearTimeout(showToast.timeout);
        showToast.timeout = window.setTimeout(() => toast.classList.remove("is-visible"), 2800);
    }

    function numberValue(value, nullable = false) {
        if (value === "") {
            return nullable ? null : 0;
        }
        return Number(value);
    }

    function roundNumber(value) {
        return Math.round(value * 10) / 10;
    }

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }
}
