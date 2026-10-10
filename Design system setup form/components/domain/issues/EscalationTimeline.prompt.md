Shows where a case is in its configured escalation chain. Done = ink check, current = blue (violet if arrived by escalation), upcoming = hollow.

```jsx
<EscalationTimeline stages={[
  {name:'Hyderabad IT Workers Committee', state:'done', sub:'Local · 7-day resolution', events:[{time:'12 Sep', text:'Assigned to Anita Desai'}]},
  {name:'Telangana IT Workers Committee', state:'current', escalatedHere:true, reason:'Resolution deadline missed', due:'4d left'},
  {name:'National IT Workers Committee', state:'upcoming', levelShort:'L3'}]} />
```
- Member-facing views: hide internal-note events; keep stage names and next expected action.
