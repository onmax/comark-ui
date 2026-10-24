Readers learn that the longest, most careful option is usually the right one. When the right option is much longer than every other, the question tests that habit instead of the idea. Shorten it, or give the wrong options the same detail.

::incorrect
```md
::question{#await}
What does `await` do inside an async function?

- [x] It pauses the function until the promise settles, then resumes it with the value
- [ ] It blocks the thread
  > Other code keeps running while the function waits.
- [ ] It throws an error
  > It throws only when the promise rejects.
::
```
::

::correct
```md
::question{#await}
What does `await` do inside an async function?

- [x] It pauses the function until the promise settles
- [ ] It blocks the whole thread until the promise settles
  > Other code keeps running while the function waits.
- [ ] It throws unless the promise has already settled
  > It throws only when the promise rejects.
::
```
::
