The invite dialog now says what's wrong with an address, and waits for a valid one before it sends.

Open **Settings › Members**, select **Invite**, type `maria@acme`, and press Tab.

::compare{title="Invite dialog with an incomplete address"}
:::screenshot{src="https://comark-ui.onmax.me/skill-invite-before.png" alt="Invite dialog with a red email field and no message" viewport="640x420"}
::::annotation{x=8.3 y=42.9 w=60.6 h=12.8 color="red"}
Only the border turns red. Nothing says what to fix.
::::

::::annotation{x=72 y=63.5 w=19.7 h=11.5 color="red"}
**Send invite** still sends to `maria@acme`.
::::
:::

:::screenshot{src="https://comark-ui.onmax.me/skill-invite-after.png" alt="Invite dialog with an error under the email field and a disabled Send invite button" viewport="640x420" href="https://pr-218.preview.acme.example/settings/members"}
::::annotation{x=8.3 y=58.3 w=49 h=5.8 mark="underline" color="green"}
"Add the domain, like maria@acme.com"
::::

::::annotation{x=72 y=71.8 w=19.7 h=11.5 color="green"}
**Send invite** waits for a valid address.
::::
:::
::

::diff{line=42 label="The change"}
```tsx [src/members/InviteDialog.tsx]
<input id="email" aria-invalid={invalid} value={email} onChange={edit} />
<button className="primary" onClick={send}>Send invite</button>
```
```tsx
<input id="email" aria-invalid={invalid} aria-describedby="email-error" value={email} onChange={edit} />
{invalid && <p id="email-error" className="error">Add the domain, like {suggestion}</p>}
<button className="primary" onClick={send} disabled={invalid}>Send invite</button>
```
::
