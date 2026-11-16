<#import "template.ftl" as layout>
<@layout.emailLayout title=msg("relayPasswordResetTitle")>
<@layout.paragraph>${msg("relayPasswordResetIntro")}</@layout.paragraph>
<@layout.actionButton href=link label=msg("relayPasswordResetButton") lifetime=linkExpirationFormatter(linkExpiration) />
<@layout.paragraph>${msg("relayPasswordResetIgnore")}</@layout.paragraph>
</@layout.emailLayout>
