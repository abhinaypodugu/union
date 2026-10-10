Row in the notification center. Kind sets the icon tile color; unread = paper-0 row + blue dot.

```jsx
<NotificationItem kind="escalation" unread title={<>Your case <b>CASE-2041</b> moved to the state committee</>} context="Issues" time="12m" />
<NotificationItem kind="announcement" title={<><b>Telangana State Committee</b> posted an announcement</>} time="2h" />
```
- Case notifications stay generic ("There is an update to your case") — same rule as lock-screen push copy.
