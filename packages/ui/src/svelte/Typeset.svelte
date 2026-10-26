<!-- Writes the typeset styles with the document rather than on mount, so `@scope` styles its root and server renders
     arrive styled. -->
<script>
  import { typesetCss } from "comark-ui/client";
</script>

{@html `<style data-comark-typeset>${typesetCss}</style>`}
