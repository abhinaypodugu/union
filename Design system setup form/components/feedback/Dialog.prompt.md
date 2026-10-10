Modal for confirmations that need a reason (escalate, revoke appointment, platform-admin override).

```jsx
<Dialog title="Escalate to state committee?" description="The Telangana IT Workers Committee will receive the full case history."
  onClose={close} footer={<><Button variant="secondary" onClick={close}>Cancel</Button><Button>Escalate case</Button></>}>
  <Field label="Reason" required><Textarea /></Field>
</Dialog>
```
- Serif title, plain-language consequence in the description. Destructive confirmations use `Button variant="danger"`.
