{{- define "ehds-relay.fullname" -}}
{{- .Release.Name | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "ehds-relay.labels" -}}
app.kubernetes.io/name: ehds-relay
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
helm.sh/chart: {{ printf "%s-%s" .Chart.Name .Chart.Version }}
{{- end -}}

{{- define "ehds-relay.apiSelectorLabels" -}}
app.kubernetes.io/name: ehds-relay
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/component: api
{{- end -}}

{{/* Fixed name so the postgres subchart can reference it from plain values */}}
{{- define "ehds-relay.dbSecretName" -}}
{{- .Values.database.existingSecret | default "ehds-relay-db" -}}
{{- end -}}

{{- define "ehds-relay.dbHost" -}}
{{- if .Values.database.host -}}
{{- .Values.database.host -}}
{{- else -}}
{{- printf "%s-postgres" .Release.Name -}}
{{- end -}}
{{- end -}}

{{/* Env shared by the API container and the migrations init container */}}
{{- define "ehds-relay.dbEnv" -}}
- name: DB_USER
  valueFrom:
    secretKeyRef:
      name: {{ include "ehds-relay.dbSecretName" . }}
      key: USERDB_USER
- name: DB_PASSWORD
  valueFrom:
    secretKeyRef:
      name: {{ include "ehds-relay.dbSecretName" . }}
      key: USERDB_PASSWORD
- name: RELAY_DATABASE_URL
  value: {{ printf "postgresql+psycopg2://$(DB_USER):$(DB_PASSWORD)@%s:%v/%s" (include "ehds-relay.dbHost" .) .Values.database.port .Values.database.name | quote }}
- name: RELAY_LOG_LEVEL
  value: {{ .Values.api.logLevel | quote }}
{{- end -}}

{{/* Selector labels for the components templated below (the API keeps its own helper) */}}
{{- define "ehds-relay.selectorLabels" -}}
app.kubernetes.io/name: ehds-relay
app.kubernetes.io/instance: {{ .ctx.Release.Name }}
app.kubernetes.io/component: {{ .component }}
{{- end -}}

{{/* In-cluster URL of the bundled Keycloak */}}
{{- define "ehds-relay.keycloakInternalUrl" -}}
{{- printf "http://%s-keycloak:%v" (include "ehds-relay.fullname" .) .Values.keycloak.service.port -}}
{{- end -}}

{{/* Issuer as browsers and tokens see it */}}
{{- define "ehds-relay.oidcIssuerUrl" -}}
{{- if .Values.oidc.issuerUrl -}}
{{- .Values.oidc.issuerUrl -}}
{{- else if .Values.keycloak.enabled -}}
{{- printf "%s/realms/%s" (trimSuffix "/" .Values.keycloak.hostname) .Values.keycloak.realm -}}
{{- end -}}
{{- end -}}

{{/* Where the API itself reaches the provider (discovery, keys, tokens) */}}
{{- define "ehds-relay.oidcInternalUrl" -}}
{{- if .Values.oidc.internalUrl -}}
{{- .Values.oidc.internalUrl -}}
{{- else if .Values.keycloak.enabled -}}
{{- printf "%s/realms/%s" (include "ehds-relay.keycloakInternalUrl" .) .Values.keycloak.realm -}}
{{- end -}}
{{- end -}}

{{- define "ehds-relay.oidcSecretName" -}}
{{- .Values.oidc.existingSecret | default (printf "%s-oidc" (include "ehds-relay.fullname" .)) -}}
{{- end -}}

{{/* OIDC client settings for the API */}}
{{- define "ehds-relay.oidcEnv" -}}
{{- $issuer := include "ehds-relay.oidcIssuerUrl" . }}
{{- $internal := include "ehds-relay.oidcInternalUrl" . }}
{{- if $issuer }}
- name: RELAY_OIDC_ISSUER_URL
  value: {{ $issuer | quote }}
{{- end }}
{{- if $internal }}
- name: RELAY_OIDC_INTERNAL_URL
  value: {{ $internal | quote }}
{{- end }}
- name: RELAY_OIDC_CLIENT_ID
  value: {{ .Values.oidc.clientId | quote }}
- name: RELAY_OIDC_CLIENT_SECRET
  valueFrom:
    secretKeyRef:
      name: {{ include "ehds-relay.oidcSecretName" . }}
      key: OIDC_CLIENT_SECRET
{{- end -}}

{{/* The web app's browser-facing origin, without a trailing slash */}}
{{- define "ehds-relay.webUrl" -}}
{{- trimSuffix "/" .Values.web.url -}}
{{- end -}}

{{/* Sign-in and session settings for the API: where the browser comes back to, and the cookie */}}
{{- define "ehds-relay.webEnv" -}}
- name: RELAY_WEB_URL
  value: {{ include "ehds-relay.webUrl" . | quote }}
- name: RELAY_SESSION_COOKIE_NAME
  value: {{ .Values.session.cookieName | quote }}
- name: RELAY_SESSION_IDLE_MINUTES
  value: {{ .Values.session.idleMinutes | quote }}
- name: RELAY_SESSION_MAX_HOURS
  value: {{ .Values.session.maxHours | quote }}
{{- end -}}

{{/* SMTP host: explicit value, else the bundled Mailpit */}}
{{- define "ehds-relay.smtpHost" -}}
{{- if .Values.smtp.host -}}
{{- .Values.smtp.host -}}
{{- else if .Values.mailpit.enabled -}}
{{- printf "%s-mailpit" (include "ehds-relay.fullname" .) -}}
{{- end -}}
{{- end -}}

{{/* SMTP settings for the worker (and anything else that sends mail) */}}
{{- define "ehds-relay.smtpEnv" -}}
{{- $host := include "ehds-relay.smtpHost" . }}
{{- if $host }}
- name: RELAY_SMTP_HOST
  value: {{ $host | quote }}
{{- end }}
- name: RELAY_SMTP_PORT
  value: {{ .Values.smtp.port | quote }}
- name: RELAY_SMTP_FROM
  value: {{ .Values.smtp.from | quote }}
{{- end -}}

{{/* Keycloak keeps its data in its own database on the bundled Postgres (else in-pod H2) */}}
{{- define "ehds-relay.keycloakDbEnabled" -}}
{{- if and .Values.postgres.enabled .Values.keycloak.database.enabled -}}true{{- end -}}
{{- end -}}

{{/* Values filled into the ${RELAY_*} placeholders of the realm JSON. Keycloak substitutes them
     itself when it imports the realm; realm-init does it for the admin API, which does not. */}}
{{- define "ehds-relay.keycloakRealmEnv" -}}
- name: RELAY_WEB_URL
  value: {{ trimSuffix "/" (.Values.keycloak.webUrl | default (include "ehds-relay.webUrl" .)) | quote }}
- name: RELAY_API_URL
  value: {{ trimSuffix "/" .Values.keycloak.apiUrl | quote }}
- name: RELAY_OIDC_CLIENT_SECRET
  valueFrom:
    secretKeyRef:
      name: {{ include "ehds-relay.oidcSecretName" . }}
      key: OIDC_CLIENT_SECRET
- name: RELAY_SMTP_HOST
  value: {{ include "ehds-relay.smtpHost" . | default "localhost" | quote }}
- name: RELAY_SMTP_PORT
  value: {{ .Values.smtp.port | quote }}
- name: RELAY_SMTP_FROM
  value: {{ .Values.smtp.from | quote }}
{{- end -}}
