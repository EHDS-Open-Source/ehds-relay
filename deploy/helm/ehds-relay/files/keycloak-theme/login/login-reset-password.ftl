<#--
  The "Reset your password" request page. Based on keycloak.v2's login-reset-password.ftl from
  Keycloak 26.8.1, with the email-address wording, a "Send reset link" button and a plain link
  back to sign in instead of a second button and a repeated instruction. The field stays
  #username (Keycloak accepts an email address or a username there).
-->
<#import "template.ftl" as layout>
<#import "field.ftl" as field>
<#import "buttons.ftl" as buttons>
<@layout.registrationLayout displayMessage=!messagesPerField.existsError('username'); section>
    <#if section = "header">
        ${msg("emailForgotTitle")}
    <#elseif section = "form">
        <form id="kc-reset-password-form" class="${properties.kcFormClass!}" action="${url.loginAction}" method="post">
            <@field.input name="username" label=msg("relayEmailAddress") value=auth.attemptedUsername!'' autofocus=true required=true />

            <@buttons.actionGroup>
              <@buttons.button id="kc-form-buttons" label="relaySendResetLink"/>
            </@buttons.actionGroup>
        </form>
        <a id="kc-back-to-sign-in" class="rl-card-link" href="${url.loginUrl}">${msg("backToLogin")}</a>
    </#if>
</@layout.registrationLayout>
