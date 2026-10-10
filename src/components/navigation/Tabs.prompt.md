Two switchers. `Tabs` (underline + optional counts) for page sections; `SegmentedControl` for 2–4 peer filters.

```jsx
<Tabs value={tab} onChange={setTab} items={[{label:'Assigned', count:12},{label:'Overdue', count:3}]} />
<SegmentedControl block value={f} onChange={setF} items={['For you','My groups','Announcements']} />
```
