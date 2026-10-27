A `::magic-move` animates from one code block to the next, so it needs two or more. With one, there's nothing to move between, and with none it renders an empty frame. Usually the next step went missing in an edit, or the code belongs in a plain code block.

::incorrect
````md
::magic-move
```ts [Start]
const total = price * 2
```
::
````
::

::correct
````md
::magic-move
```ts [Start]
const total = price * 2
```

```ts [Extract]
const rate = 2
const total = price * rate
```
::
````
::
