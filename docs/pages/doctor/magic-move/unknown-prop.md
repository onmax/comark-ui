`::magic-move` reads only `title`, the name a screen reader hears. Every other prop is ignored, so a guessed one changes nothing: `duration=800` still moves at the same speed.

::incorrect
````md
::magic-move{title="Extract the rate" duration=800}
```ts
const total = price * 2
```

```ts
const rate = 2
const total = price * rate
```
::
````
::

::correct
````md
::magic-move{title="Extract the rate"}
```ts
const total = price * 2
```

```ts
const rate = 2
const total = price * rate
```
::
````
::
