Teams-style org tree. Geography nodes = grey tile, functional groups = outlined tile, committees = blue tile — so parent/child, membership and appointment never read as the same relationship (PRD §7.4).

```jsx
<OrgTree defaultExpanded={['in','tg']} selected="hyd-it" onSelect={n => setSel(n.id)} nodes={[
  {id:'in', name:'India', type:'country', kind:'Country', children:[
    {id:'tg', name:'Telangana', type:'state', kind:'State', children:[ … ]}]}]} />
```
- `kind` carries tenant terminology; never hard-code "State" or "City".
