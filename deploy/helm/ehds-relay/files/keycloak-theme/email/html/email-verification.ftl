<#import "template.ftl" as layout>
<@layout.emailLayout title=msg("relayEmailVerificationTitle")>
<@layout.paragraph>${msg("relayEmailVerificationIntro")}</@layout.paragraph>
<@layout.actionButton href=link label=msg("relayEmailVerificationButton") lifetime=linkExpirationFormatter(linkExpiration) />
<@layout.paragraph>${msg("relayEmailVerificationIgnore")}</@layout.paragraph>
</@layout.emailLayout>
