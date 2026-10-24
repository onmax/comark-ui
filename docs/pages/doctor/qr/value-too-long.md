A QR code holds up to about 2,300 characters at the error correction `:qr` uses. A longer `value` can't be encoded, so the code renders nothing. A value that long is usually a whole page pasted in, or a link with a large state in its query.

Link to a short URL instead, such as the deploy's preview, and let that page hold the rest:

```md
<!-- Not the 3,000-character link with the pigeon survey's answers in its query. -->
:qr{value="https://pigeons.example.com/survey/42"}
```
