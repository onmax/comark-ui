Every block inside `::magic-move` is one step of the code, so only code blocks go there. Anything else, such as a paragraph explaining a step, is dropped. Name each step with a label after the fence's language instead, or move the text above or below the block.

::incorrect
````md
::magic-move
```ts
const total = price * 2
```

Pull the rate out into a constant.

```ts
const rate = 2
const total = price * rate
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

```ts [Pull the rate out into a constant]
const rate = 2
const total = price * rate
```
::
````
::
