# FitCompare - Fitness Activity File Analyzer

FitCompare is a web application for analyzing and comparing fitness activity files (FIT files). Upload two FIT files from your GPS watch or cycling computer to compare time-synced metrics side-by-side and across a combined heart rate chart.

## Key Features

- Upload and parse `.fit` files
- Side-by-side metrics comparison (sport, average/max heart rate, timestamps, record counts)
- Interactive heart rate chart with native area selection zoom (ECharts)
- Responsive design and dark athletic theme
- Simple dev setup with Vite + React + TypeScript

## Quick Start

### Prerequisites
- Node.js 16+ and npm or yarn

### Install and Run

```bash
git clone <repo-url>
cd fit-compare
npm install
npm run dev
```

Open http://localhost:5174 in your browser.

### Build

```bash
npm run build
```

## How to Use

1. Choose `File 1` and `File 2` and upload `.fit` files.
2. When both files are uploaded and parsed, the comparison view will appear.
3. Use drag-to-zoom on the chart to select a time range and zoom; use `Reset Zoom` to return to full view.
4. Compare metrics in the table and visually examine heart rate overlaps on the chart.

## Project Structure

Code is organised by **feature**, not by file kind. Each feature folder owns its
types, its pure logic, its hooks and its components; `components/` and `lib/`
hold only things genuinely shared between features.

```
src/
  App.tsx                  App shell: upload screen ⇄ comparison screen
  main.tsx

  features/
    fit-file/              Reading and parsing .fit files
      fitTypes.ts            Domain model (FitActivity, FitLap, FitRecord…)
      parseFitData.ts        Raw parser output → domain model (pure)
      loadFitFile.ts         File/network I/O, React-free
      heartRateSamples.ts    Second-bucketing + the 0-bpm dropout rule (pure)
      useFitFiles.ts         Loading + error state per upload slot
      fileSlots.ts           How many upload slots there are, and their roles
      sampleFiles.ts         Bundled sample activities from /data
    upload/                The landing screen
      UploadView.tsx
      FileUploadCard.tsx / .css
    comparison/            The 2-file results screen
      ComparisonView.tsx / .css
      ActivityComparisonTable.tsx / .css
      comparisonChartData.ts Aligns recordings onto one timeline (pure)
      comparisonStats.ts     Bland-Altman, Lin's CCC, differences (pure)
      comparisonSummary.ts   Pairs two series and runs the stats (pure)
      agreementScale.ts      good/warn/bad thresholds
      useComparisonData.ts   Memoises the two steps above
    batch/                 The many-activities overview screen
      activitySessions.ts    Groups filenames into (date, activity) sessions (pure)
      alignSamples.ts        N-device intersection of second-indexed samples (pure)
      batchAgreement.ts      Per-session + pooled Bland-Altman/CCC (pure)
      loadBatch.ts           Concurrency-limited load/parse of many files (pure)
      useBatchFiles.ts       Loading state for the whole batch
      useBatchAgreement.ts   Memoises grouping → samples → agreement
      BatchView.tsx / .css
      BatchSessionTable.tsx / .css

  components/              Shared UI, no feature knowledge
    GraphCard.tsx / .css
    StatBadge.tsx / .css
    charts/
      useEChart.ts           ECharts lifecycle ↔ React
      chartTheme.ts          Palette + shared axis/tooltip styling
      pointDensity.ts        Dedupe + weight scatter points (pure)
      *Chart.tsx             Thin components
      *Option.ts             Pure ECharts option builders (testable)

  lib/                     Framework-free helpers (pace maths, filenames)
```

Two conventions worth keeping:

- **Pure logic lives outside React.** Anything that could be a plain function is
  one, so it can be unit-tested without rendering. Hooks only decide *when* to
  recompute.
- **`components/` never imports a feature's barrel** (`features/x/index.ts`),
  only specific modules — that's what keeps import cycles from forming.

## Developer Notes

- `fit-file-parser` converts FIT binaries to JSON; `parseFitData` is the only
  code that touches that raw shape, so its output types can be trusted.
- ECharts provides native `dataZoom` and handles tens of thousands of points.
- Chart configuration lives in pure `*Option.ts` builders; if a chart looks
  wrong, that's the file to read (and the one to test).

## Contributing

Contributions are welcome. Open an issue or PR and follow the code style in the repository.

## License

MIT
