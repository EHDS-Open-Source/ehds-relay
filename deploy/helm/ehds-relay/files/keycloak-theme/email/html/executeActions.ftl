<#outputformat "plainText">
<#assign requiredActionsText><#if requiredActions??><#list requiredActions><#items as reqActionItem>${msg("requiredAction.${reqActionItem}")}<#sep>, </#sep></#items></#list></#if></#assign>
</#outputformat>
<#import "template.ftl" as layout>
<@layout.emailLayout title=msg("relayExecuteActionsTitle")>
<@layout.paragraph>${msg("relayExecuteActionsIntro", requiredActionsText)}</@layout.paragraph>
<@layout.actionButton href=link label=msg("relayExecuteActionsButton") lifetime=linkExpirationFormatter(linkExpiration) />
<@layout.paragraph>${msg("relayExecuteActionsIgnore")}</@layout.paragraph>
</@layout.emailLayout>
