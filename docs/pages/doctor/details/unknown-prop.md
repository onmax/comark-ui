`::details` reads `summary`, `open`, and `icon`; `::accordion` reads `type` and `defaultValue`; each `:::accordion-item` reads `label`, `icon`, and `description`; and `::collapsible` reads `name`, `openText`, `closeText`, and `icon`. Any other prop is ignored, so a misspelled `openText` leaves the button reading "Show".

::incorrect
```md
::collapsible{name="deploy options" opentext="Peek at"}
- `region`: where the pigeons fly from.
::
```
::

::correct
```md
::collapsible{name="deploy options" openText="Peek at"}
- `region`: where the pigeons fly from.
::
```
::
