Small status pill. Tones map to workflow meaning, not decoration: info = in-hand, success = resolved, warning = waiting/due soon, danger = overdue/rejected, escalated = moved up the chain.

```jsx
<Badge tone="danger" dot>Overdue</Badge>
<Badge tone="escalated" icon="chevrons-up">Escalated · L2</Badge>
<Count>3</Count>
```
- For issue statuses prefer `StatusBadge`, which maps the PRD lifecycle for you.
