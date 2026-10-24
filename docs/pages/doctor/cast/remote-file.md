A cast is read while the document is parsed, from files under the plugin's `root`. A URL is never fetched, so a `src` with `https://` or any other scheme renders nothing. Download the recording next to the document instead.

::incorrect
```md
::cast{src="https://example.com/deploy.cast"}
::
```
::

::correct
```md
::cast{src="deploy.cast"}
::
```
::
