<#--
  The realm's password rules, listed under the new-password field before the first attempt and
  ticked off as the person types. Replaces keycloak.v2's password-validation.ftl (Keycloak
  26.8.1), which only listed the broken rules after the field lost focus. Same two macros, so
  register.ftl and login-update-password.ftl use it unchanged. The server still checks the
  policy on submit; its messages are in messages_en.properties.
-->
<#macro templates>
</#macro>

<#-- One rule: a list item the script below ticks off. "kind" names the check in the script. -->
<#macro rule kind value text>
    <li class="rl-rule" data-rule="${kind}" data-value="${value?c}" data-met="false">
        <span class="rl-icon rl-rule-icon" aria-hidden="true"></span>
        <span class="rl-rule-text">${text}</span>
        <span class="rl-visually-hidden rl-rule-state" data-met-text="${msg('relayPasswordRuleMet')}" data-unmet-text="${msg('relayPasswordRuleUnmet')}">${msg('relayPasswordRuleUnmet')}</span>
    </li>
</#macro>

<#-- The message for a rule that needs "count" of something: the singular form for one. -->
<#function countMsg key count>
    <#return (count == 1)?then(msg(key + "One"), msg(key + "Many", count?c))>
</#function>

<#macro script field="">
    <div class="rl-rules" id="password-rules-${field}" hidden>
        <p class="rl-rules-intro" id="password-rules-intro-${field}">${msg("relayPasswordRulesIntro")}</p>
        <ul class="rl-rules-list">
            <#if (passwordPolicies.length)??>
                <@rule kind="length" value=passwordPolicies.length text=msg("relayPasswordRuleLength", passwordPolicies.length?c) />
            </#if>
            <#if (passwordPolicies.upperCase)??>
                <@rule kind="upperCase" value=passwordPolicies.upperCase text=countMsg("relayPasswordRuleUpperCase", passwordPolicies.upperCase) />
            </#if>
            <#if (passwordPolicies.lowerCase)??>
                <@rule kind="lowerCase" value=passwordPolicies.lowerCase text=countMsg("relayPasswordRuleLowerCase", passwordPolicies.lowerCase) />
            </#if>
            <#if (passwordPolicies.digits)??>
                <@rule kind="digits" value=passwordPolicies.digits text=countMsg("relayPasswordRuleDigits", passwordPolicies.digits) />
            </#if>
            <#if (passwordPolicies.specialChars)??>
                <@rule kind="specialChars" value=passwordPolicies.specialChars text=countMsg("relayPasswordRuleSpecialChars", passwordPolicies.specialChars) />
            </#if>
            <#if (passwordPolicies.maxLength)??>
                <@rule kind="maxLength" value=passwordPolicies.maxLength text=msg("relayPasswordRuleMaxLength", passwordPolicies.maxLength?c) />
            </#if>
        </ul>
        <#if (passwordPolicies.notUsername)?? || (passwordPolicies.notEmail)??>
            <p class="rl-rules-note">${msg("relayPasswordRuleNotUsername")}</p>
        </#if>
    </div>
    <script type="module">
        <#outputformat "JavaScript">
        // Shown only when the page has the field: registration asks for the password later
        // when email verification is on.
        const field = document.getElementById(${field?c});
        const rules = document.getElementById(${("password-rules-" + field)?c});
        if (field && rules) {
            // Under the field's own group, after its show/hide button and any server message.
            const group = field.closest(".rl-group");
            if (group) {
                group.append(rules);
            }
            rules.hidden = false;
            const describedBy = (field.getAttribute("aria-describedby") || "").split(" ").filter(Boolean);
            describedBy.push(${("password-rules-intro-" + field)?c});
            field.setAttribute("aria-describedby", describedBy.join(" "));

            // The same checks as Keycloak's own password-policy.js.
            const count = (value, test) => [...value].filter(test).length;
            const checks = {
                length: (value, n) => value.length >= n,
                maxLength: (value, n) => value.length <= n,
                upperCase: (value, n) => count(value, (c) => c === c.toUpperCase() && c !== c.toLowerCase()) >= n,
                lowerCase: (value, n) => count(value, (c) => c === c.toLowerCase() && c !== c.toUpperCase()) >= n,
                digits: (value, n) => count(value, (c) => /\d/.test(c)) >= n,
                specialChars: (value, n) => count(value, (c) => /[^\p{L}\p{Nd}]/u.test(c)) >= n,
            };
            const update = () => {
                for (const item of rules.querySelectorAll("[data-rule]")) {
                    const check = checks[item.dataset.rule];
                    // maxLength is only "met" once something is typed.
                    const met = field.value.length > 0 && check(field.value, Number(item.dataset.value));
                    item.dataset.met = String(met);
                    const state = item.querySelector(".rl-rule-state");
                    state.textContent = met ? state.dataset.metText : state.dataset.unmetText;
                }
            };
            field.addEventListener("input", update);
            update();
        }
        </#outputformat>
    </script>
</#macro>
