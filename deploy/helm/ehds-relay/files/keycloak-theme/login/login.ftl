<#--
  The sign-in page. Based on keycloak.v2's login.ftl from Keycloak 26.8.1, with:
  - wrong credentials marking both fields, the message under the password;
  - after a failed attempt, a notice on the card offering a reset by email;
  - "Create one" and an always-visible reset line on white under the card instead of links
    inside it.
  The ids #username, #password and #kc-login and the field names stay as they are: the
  end-to-end tests and the password check script use them.
-->
<#import "template.ftl" as layout>
<#import "field.ftl" as field>
<#import "buttons.ftl" as buttons>
<#import "social-providers.ftl" as identityProviders>
<#import "passkeys.ftl" as passkeys>
<#assign signInFailed = messagesPerField.existsError('username','password')>
<@layout.registrationLayout displayMessage=!signInFailed displayInfo=false; section>
<!-- template: login.ftl (ehds-relay) -->

    <#if section = "header">
        ${msg("loginAccountTitle")}
    <#elseif section = "form">
        <div id="kc-form">
          <div id="kc-form-wrapper">
            <#if realm.password>
                <#assign signInError = messagesPerField.getFirstError('username','password')>
                <form id="kc-form-login" class="${properties.kcFormClass!}" onsubmit="login.disabled = true; return true;" action="${url.loginAction}" method="post" novalidate="novalidate">
                    <#if !usernameHidden??>
                        <#assign label>
                            <#if !realm.loginWithEmailAllowed>${msg("username")}<#elseif !realm.registrationEmailAsUsername>${msg("usernameOrEmail")}<#else>${msg("email")}</#if>
                        </#assign>
                        <#-- Marked invalid with the password; the message itself shows under the password. -->
                        <div class="rl-error-elsewhere">
                            <@field.input name="username" label=label error=signInError
                                autofocus=true autocomplete="${(enableWebAuthnConditionalUI?has_content)?then('username webauthn', 'username')}" value=login.username!'' />
                        </div>
                    </#if>
                    <@field.password name="password" label=msg("password") error=signInError forgotPassword=false autofocus=usernameHidden?? autocomplete="current-password">
                        <#if realm.rememberMe && !usernameHidden??>
                            <@field.checkbox name="rememberMe" label=msg("rememberMe") value=login.rememberMe?? />
                        </#if>
                    </@field.password>

                    <#if signInFailed && realm.resetPasswordAllowed>
                        <div class="rl-notice" role="status">
                            <span class="rl-icon rl-icon-info" aria-hidden="true"></span>
                            <span>${msg("relayForgotQuestion")} <a class="rl-quiet-link" href="${url.loginResetCredentialsUrl}">${msg("relayForgotAction")}</a></span>
                        </div>
                    </#if>

                    <input type="hidden" id="id-hidden-input" name="credentialId" <#if auth.selectedCredential?has_content>value="${auth.selectedCredential}"</#if>/>
                    <@buttons.loginButton />
                </form>
            </#if>
            </div>
        </div>
        <@passkeys.conditionalUIData />
    <#elseif section = "socialProviders" >
        <#if realm.password && social.providers?? && social.providers?has_content>
            <@identityProviders.show social=social/>
        </#if>
    <#elseif section = "below" >
        <#if realm.password && realm.registrationAllowed && !registrationDisabled??>
            <p id="kc-registration" class="rl-below">
                ${msg("noAccount")} <a class="rl-below-link" href="${url.registrationUrl}">${msg("relayCreateAccount")}</a>
            </p>
        </#if>
        <#if realm.password && realm.resetPasswordAllowed>
            <p class="rl-below rl-below-quiet">
                ${msg("relayForgotQuestion")} <a class="rl-below-link" href="${url.loginResetCredentialsUrl}">${msg("relayForgotAction")}</a>
            </p>
        </#if>
    </#if>

</@layout.registrationLayout>
