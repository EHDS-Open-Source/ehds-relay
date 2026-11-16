<#--
  Frame of every HTML email: a blue band with the "EHDS Relay" wordmark and the yellow asterisk,
  a white card with the message, and a short footer. Built from tables with inline styles,
  web-safe fallbacks for Poppins and no images, so it reads the same in clients that block
  images, web fonts and <style> blocks.

  The colours are the app's brand tokens written out, because email clients do not support CSS
  variables. The theme drift test checks that each one is still a token in tokens.css.
-->
<#macro emailLayout title="">
<!DOCTYPE html>
<html lang="${locale.language}" dir="${(ltr)?then('ltr','rtl')}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title><#if title?has_content>${title}<#else>${msg("relayAppName")}</#if></title>
</head>
<body style="margin:0;padding:0;background-color:#f3f4fd;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f3f4fd;">
  <tr>
    <td align="center" style="padding:24px 12px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;">
        <tr>
          <td style="background-color:#1c2fd4;border-radius:16px 16px 0 0;padding:24px 32px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="font-family:Poppins,Arial,sans-serif;font-size:22px;line-height:28px;font-weight:700;color:#ffffff;">${msg("relayAppName")}</td>
                <td aria-hidden="true" style="padding-left:6px;font-family:Arial,sans-serif;font-size:24px;line-height:28px;font-weight:700;color:#f8f121;">&#10033;</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="background-color:#ffffff;border-radius:0 0 16px 16px;padding:32px;font-family:Poppins,Arial,sans-serif;font-size:16px;line-height:26px;color:#444444;">
            <#if title?has_content>
            <h1 style="margin:0 0 16px;font-family:Poppins,Arial,sans-serif;font-size:24px;line-height:32px;font-weight:600;color:#1c2fd4;">${title}</h1>
            </#if>
            <#nested>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px;font-family:Poppins,Arial,sans-serif;font-size:13px;line-height:20px;color:#6e7084;">
            ${msg("relayEmailFooter")}
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>
</#macro>

<#-- A paragraph of the message. -->
<#macro paragraph>
<p style="margin:0 0 16px;font-family:Poppins,Arial,sans-serif;font-size:16px;line-height:26px;color:#444444;"><#nested></p>
</#macro>

<#-- The main action: a yellow pill with blue text, then the address in full for clients that
     do not show the button, and how long the link works. -->
<#macro actionButton href label lifetime>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;">
  <tr>
    <td style="background-color:#f8f121;border-radius:999px;">
      <a href="${href}" style="display:inline-block;padding:14px 28px;font-family:Poppins,Arial,sans-serif;font-size:16px;line-height:20px;font-weight:600;color:#1c2fd4;text-decoration:none;border-radius:999px;">${label}</a>
    </td>
  </tr>
</table>
<@paragraph>${msg("relayEmailLinkLifetime", lifetime)}</@paragraph>
<p style="margin:0 0 16px;font-family:Poppins,Arial,sans-serif;font-size:14px;line-height:22px;color:#6e7084;">${msg("relayEmailLinkFallback")}<br><a href="${href}" style="color:#1c2fd4;word-break:break-all;">${href}</a></p>
</#macro>
