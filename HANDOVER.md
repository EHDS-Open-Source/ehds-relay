# Handover: dataset form restyle

- The form stays one page with the section menu and the "Save changes" menu.
- Required stars follow what the server needs to publish; the unique-individuals star shows only when "Personal data" is Yes.
- Grouped sub-fields sit on a pale panel (`panelClass`, `GroupPanel`); nested groups do not add a second panel.
- Group errors (applicable legislation lists) show under the list and turn the star magenta; sub-field errors show under their own inputs, the group star does not change for those.
- Clear opens a confirmation unless the form equals an empty one.
- Not done: character counters, custom dropdown and date picker (separate work).
