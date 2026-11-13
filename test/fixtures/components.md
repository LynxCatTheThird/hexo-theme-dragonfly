---
title: Component integration test
date: 2026-01-01
abbrlink: component-integration-test
password: component-test-only
autoSave: false
comments: false
---

## Formula

$$\AuditSymbol + x^2$$

Inline $x^2$ and chemistry $\ce{H2O}$.

$$\ce{CO2 + H2O -> H2CO3}$$

## ECharts

```echarts
{"title":{"text":"ECharts {% sample %}"},"xAxis":{"data":["A","B"]},"yAxis":{},"series":[{"type":"bar","data":[3,5]}]}
```

## Chart.js

{% chartjs 90,false,component-chart %}
<!-- chart -->
{"type":"bar","data":{"labels":["A","B"],"datasets":[{"label":"Test","data":[3,5]}]},"options":{}}
<!-- endchart -->
{% endchartjs %}

## Mermaid

{% mermaid %}
flowchart LR
  A[Start] --> B[Done]
{% endmermaid %}

## Image

![Pixel](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==)

## Tabs

{% tabs keyboard %}
<!-- tab First -->
First panel.
<!-- endtab -->
<!-- tab Second -->
Second panel.
{% subtabs nested %}
<!-- tab Nested first -->
Inner first.
<!-- endtab -->
<!-- tab Nested second -->
Inner second.
<!-- endtab -->
{% endsubtabs %}
<!-- endtab -->
{% endtabs %}
