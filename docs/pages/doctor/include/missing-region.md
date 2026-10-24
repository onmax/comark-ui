`region` pastes the lines between `#region name` and `#endregion name` comments in the file. When no `#region` has that name, usually a typo or a marker that was renamed, the include is dropped.

::incorrect
```md
:include{src="deploy.sh" region="biuld"}
```
::

::correct
```md
:include{src="deploy.sh" region="build"}
```
::
