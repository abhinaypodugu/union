Translucent bottom tab bar for the member app. Active item: ink + heavier stroke (no colored fills).

```jsx
<TabBar value={tab} onChange={setTab} items={[
  {value:'home',label:'Home',icon:'house'},
  {value:'groups',label:'Groups',icon:'users-round'},
  {value:'issues',label:'Issues',icon:'circle-alert'},
  {value:'alerts',label:'Alerts',icon:'bell',badge:3},
  {value:'org',label:'Organization',icon:'network'}]} />
```
- Profile and Management live behind the avatar in the header, keeping 5 tabs.
