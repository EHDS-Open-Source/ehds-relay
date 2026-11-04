# Handover: members, invitations, organisation settings and account restyle

## Done
- Member rows: shadow cards (14px radius, no border, 16px by 20px padding, 79px tall on desktop),
  name blue 600 at 1.15em, email ink 600 at 0.9em, "(you)" kept, joined date dropped. Owners get a
  compact 34px role dropdown; a role tag (`RoleTag`) is shown instead when roles cannot be changed
  (`canChangeRoles={false}`; the list itself is owner-only today). Remove is a 34px row action with
  the remove-user icon after the label.
- Invitation rows: address in ink, "Standard · Invited 4 November 2026" in grey beneath, status
  pills (`StatusPill`): Invite sent info, Accepted success, Expired warning, Cancelled neutral with
  a cross. Resend is a small secondary with "Sending…" and the busy star on the one being sent
  (other Resends disabled meanwhile). Cancel invitation is a row action with the remove-user icon;
  its confirmation has the same icon.
- Invite form stays inline: on desktop a subgrid (label, control, message, hint rows) puts the
  Send invitation button on the control row, so it lines up with the fields whether or not an error
  or hint is shown. The add-user icon follows the label; busy shows "Sending…".
- "Users", "Invitations", "User details", "My organisations", "Notifications" headings use the H3
  size (1.3em, 700, blue).
- Organisation settings: 560px shadow card, 32px padding, 24px between fields, Country hint, Save
  changes below the card.
- Account: User details card 560px (24px padding), Role in this organisation row (divider, tag,
  hint) when the user has exactly one organisation, Save changes and Log out 20px below the card.
  Organisation list and notification switches are shadow cards. The text link back is gone (the
  header Back covers it); a secondary button with the back icon remains only for users with no
  organisation, where the header has no Back.
- Shared looks live in `web/src/members/rowStyles.ts` and `web/src/members/tags.tsx`.

## Measured against the design (1280 and 390)
Row height 79 (123 wrapped on phones, invitation 169), tag 27px at 12px/600, Remove 120x34 with a
16px icon, Resend 88x34, settings card 560 wide with 32px padding, hint 13.2px/500 in the hint blue,
role row 20px top padding with a 1px line, Save to Log out gap 10px. No horizontal scroll.

## Left / differences
- Field labels are 19.6px tall (line-height 1.375) where the design has 22.8px (1.6); this is the
  shared `Label` and was left alone.
- The `SaveButton` icon is 20px; the design's save icon is 18px. Shared component, left alone.
- Wording kept: "Cancel invitation" (design: "Cancel invite"), page title "Organisation settings".
- Invite pop-up, seat count, transfer ownership, the Manage organisation hub and account tabs are
  separate work.
