Action button; use `primary` for the one main action in a region, `secondary` beside it, `ghost` for toolbars, `danger` for removals/revocations.

```jsx
<Button icon="plus">Raise an issue</Button>
<Button variant="secondary">Cancel</Button>
<Button variant="danger" size="sm" icon="user-minus">Remove from committee</Button>
```

- sizes: sm 32px, md 40px, lg 48px (use lg for mobile primary CTAs)
- `block` stretches full width (mobile sheets)
- Labels are verbs in sentence case: "Escalate case", not "ESCALATE".
