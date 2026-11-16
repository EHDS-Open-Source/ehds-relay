<#--
  The two-step verification code page. Based on keycloak.v2's login-otp.ftl from Keycloak
  26.8.1, with a "Verify" button, the required mark and a link back to sign in.
-->
<#import "template.ftl" as layout>
<#import "field.ftl" as field>
<#import "buttons.ftl" as buttons>
<@layout.registrationLayout displayMessage=!messagesPerField.existsError('totp'); section>
<!-- template: login-otp.ftl -->

    <#if section="header">
        ${msg("doLogIn")}
    <#elseif section="form">
        <form id="kc-otp-login-form" class="${properties.kcFormClass!}" onsubmit="login.disabled = true; return true;" action="${url.loginAction}" method="post">
            <input id="selectedCredentialId" type="hidden" name="selectedCredentialId" value="${otpLogin.selectedCredentialId!''}">
            <#if otpLogin.userOtpCredentials?size gt 1>
                <div class="${properties.kcFormGroupClass!}">
                    <div class="${properties.kcInputWrapperClass!}">
                        <#list otpLogin.userOtpCredentials as otpCredential>
                            <div id="kc-otp-credential-${otpCredential?index}" class="${properties.kcLoginOTPListClass!}"
                                    onclick="toggleOTP(${otpCredential?index}, '${otpCredential.id}')">
                                <span class="${properties.kcLoginOTPListItemHeaderClass!}">
                                    <span class="${properties.kcLoginOTPListItemIconBodyClass!}">
                                      <i class="${properties.kcLoginOTPListItemIconClass!}" aria-hidden="true"></i>
                                    </span>
                                    <span class="${properties.kcLoginOTPListItemTitleClass!}">${otpCredential.userLabel}</span>
                                </span>
                            </div>
                        </#list>
                    </div>
                </div>
            </#if>

            <@field.input name="otp" label=msg("loginOtpOneTime") autocomplete="one-time-code" fieldName="totp" autofocus=true required=true />

            <@buttons.actionGroup>
                <@buttons.button id="kc-login" name="login" label="relayVerify" />
            </@buttons.actionGroup>
        </form>
        <a id="kc-back-to-sign-in" class="rl-card-link" href="${url.loginRestartFlowUrl}">${msg("backToLogin")}</a>
        <script>
            <#outputformat "JavaScript">
            function toggleOTP(index, value) {
                // select the clicked OTP credential
                document.getElementById("selectedCredentialId").value = value;
                // remove selected class from all OTP credentials
                Array.from(document.getElementsByClassName(${properties.kcLoginOTPListSelectedClass!?c})).map(i => i.classList.remove(${properties.kcLoginOTPListSelectedClass!?c}));
                // add selected class to the clicked OTP credential
                document.getElementById("kc-otp-credential-" + index).classList.add(${properties.kcLoginOTPListSelectedClass!?c});
            }
            </#outputformat>
        </script>
    </#if>
</@layout.registrationLayout>