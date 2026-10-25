<!--
  An AI SDK message's parts: text as Markdown, files, and the turn's reasoning, tool calls, and sources as one trace.
  Each snippet replaces its kind and gets what `read()` made of the part, with `index` and `part`.
-->
<script>
  import { onMount } from "svelte";
  import { read } from "comark-chat";
  import { addStyles } from "comark-chat/client";
  import Line from "./Line.svelte";
  import MessageMarkdown from "./MessageMarkdown.svelte";

  let {
    parts,
    streaming = false,
    plugins,
    components,
    options,
    markdown,
    text,
    reasoning,
    tool,
    source,
    file,
    step,
    fallback,
  } = $props();
  onMount(addStyles);
  const blocks = $derived(read(parts, streaming));
</script>

<div class="cht" data-streaming={streaming ? "" : undefined}>
  {#each blocks as block (block.kind === "trace" ? `trace-${block.index}` : `part-${block.index}`)}
    {#if block.kind === "trace"}
      <ul class="cht-trace">
        {#each block.steps as item (item.kind === "tool" ? item.id : item.index)}
          <li class="cht-step" data-kind={item.kind} data-status={item.kind === "source" ? undefined : item.status}>
            {#if item.kind === "source"}
              {#if source}{@render source(item)}
              {:else if item.href}<Line step={item} tag="a" href={item.href} rel="noreferrer" target="_blank" />
              {:else}<Line step={item} />{/if}
            {:else if item.kind === "reasoning"}
              {#if reasoning}{@render reasoning(item)}
              {:else if item.text}
                <details>
                  <Line step={item} tag="summary" />
                  <div class="cht-detail">
                    {#if markdown}{@render markdown({ value: item.text, streaming: item.status === "running" })}
                    {:else}<MessageMarkdown value={item.text} streaming={item.status === "running"} {plugins} {components} {options} />{/if}
                  </div>
                </details>
              {:else}<Line step={item} />{/if}
            {:else if tool}{@render tool(item)}
            {:else if item.values.length}
              <details>
                <Line step={item} tag="summary" />
                <div class="cht-detail">
                  {#each item.values as value (value.label)}
                    <div class="cht-value" data-label={value.label}>
                      <div class="cht-value-label">{value.label}</div>
                      <pre><code>{value.text}</code></pre>
                    </div>
                  {/each}
                </div>
              </details>
            {:else}<Line step={item} />{/if}
          </li>
        {/each}
      </ul>
    {:else if block.kind === "text"}
      {#if text}{@render text(block)}
      {:else if markdown}{@render markdown({ value: block.text, streaming: block.streaming })}
      {:else}<MessageMarkdown value={block.text} streaming={block.streaming} {plugins} {components} {options} />{/if}
    {:else if block.kind === "file"}
      {#if file}{@render file(block)}
      {:else if block.image}<img class="cht-image" alt={block.name} src={block.image} loading="lazy" />
      {:else if block.href}
        <a
          class="cht-file"
          href={block.href}
          download={block.download}
          rel={block.href.startsWith("data:") ? undefined : "noreferrer"}
          target={block.href.startsWith("data:") ? undefined : "_blank"}
        >
          <span class="cht-file-name">{block.name}</span>
          {#if block.mediaType && block.mediaType !== block.name}<span class="cht-file-type">{block.mediaType}</span>{/if}
        </a>
      {:else}
        <span class="cht-file">
          <span class="cht-file-name">{block.name}</span>
          {#if block.mediaType && block.mediaType !== block.name}<span class="cht-file-type">{block.mediaType}</span>{/if}
        </span>
      {/if}
    {:else if block.kind === "step-start"}
      {#if step}{@render step(block)}{/if}
    {:else if fallback}{@render fallback(block)}{/if}
  {/each}
</div>
