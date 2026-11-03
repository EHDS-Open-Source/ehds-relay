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
