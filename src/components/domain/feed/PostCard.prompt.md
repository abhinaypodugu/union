Instagram-familiar feed card with mandatory source, time and audience labels.

```jsx
<PostCard kind="official" pinned author={{name:'Telangana State Committee'}} source="Telangana · All members" time="2h"
  title="Statewide meeting on revised shift rules" body="…" audience={{scope:'region', label:'Telangana'}} likes={214} comments={38} />
<PostCard author={{name:'Ravi Kumar'}} source="Hyderabad · IT Workers" time="35m" body="…" media="photo · meeting at Hitech City" />
```
- Issues never render as PostCards. Escalations never create posts.
