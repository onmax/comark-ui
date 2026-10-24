`avatar` takes an image URL, a GitHub account as `@user`, or an account on another network as `provider:name`. A bare name such as `avatar="octocat"` is none of these, so the chip loads it as an image path and shows a broken image.

::incorrect
```md
Thanks [Mona](https://example.com/mona){avatar="octocat"} for counting the ducks.
```
::

::correct
```md
Thanks [Mona](https://example.com/mona){avatar="@octocat"} for counting the ducks.
```
::
