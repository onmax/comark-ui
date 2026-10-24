The file is there, but reading it threw, so the table renders nothing. On disk this is usually a folder named like a file or a file the process can't open. With your own `read`, it's whatever that function threw, and the message repeats it.

```ts
import table from "comark-table";

table({
  read: async (path) => {
    const response = await fetch(`https://ponds.example.com/data/${path}`);
    // Throwing here reports read-failed; return undefined instead when the file doesn't exist.
    if (response.status === 404) return undefined;
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.text();
  },
});
```
