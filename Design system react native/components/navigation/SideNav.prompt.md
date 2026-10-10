Admin dashboard sidebar with tenant switcher at top. Items grouped by concern (Work · Structure · Configure).

```jsx
<SideNav org={{name:'Telangana Workers Federation', scope:'State admin · Telangana'}} value="queue" onChange={setView}
  sections={[{heading:'Work', items:[{value:'queue',label:'Issue queue',icon:'inbox',badge:24},{value:'esc',label:'Escalations',icon:'chevrons-up',badge:3,alert:true}]}]} />
```
- The tenant name is always visible — admins must never be unsure which organization they're acting in.
