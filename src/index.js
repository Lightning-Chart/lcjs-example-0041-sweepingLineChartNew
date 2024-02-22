const lcjs = require('@arction/lcjs')
const { lightningChart, Themes, AxisTickStrategies } = lcjs

const CONFIG = {
    timeView: 5_000, // milliseconds
    sampleRate: 1_000, // Hz, samples per second
}
const sampleCount = Math.ceil((CONFIG.sampleRate * CONFIG.timeView) / 1000)

const lc = lightningChart()
const chart = lc
    .ChartXY({
        // theme: Themes.darkGold
    })
    .setTitle('Sweeping Real-Time Chart')
    .setAutoCursor((cursor) => cursor.setTickMarkerXVisible(false))

chart.getDefaultAxisX().setDefaultInterval({ start: 0, end: CONFIG.timeView }).setTickStrategy(AxisTickStrategies.Empty)
const series = chart
    .addPointLineAreaSeries({
        dataPattern: 'ProgressiveX',
    })
    .setMaxSampleCount(sampleCount)

// Keep track which index last existing sample is positioned at
let lastSampleIndex = -1
const handleIncomingData = (yValues) => {
    const count = yValues.length
    // Calculate which samples can be appended to right side, and which have to be started again from left side of sweeping history.
    const space = sampleCount - (lastSampleIndex + 1)
    // Put first set of samples to extend previous samples.
    const countRight = Math.min(space, count)
    series.alterSamples(lastSampleIndex + 1, { yValues, count: countRight })
    lastSampleIndex += countRight
    if (countRight < space) {
        // Remove the few oldest points that would be connected to last points pushed just now, to leave a gap between newest and oldest data.
        const gapCount = Math.min(Math.round(sampleCount * 0.05), sampleCount - (lastSampleIndex + 1))
        // Gap is displayed by using NaN as Y values.
        series.alterSamples(lastSampleIndex + 1, { yValues: new Array(gapCount).fill(Number.NaN) })
    }
    // Put other samples (if any) to beginning of sweeping history.
    const countLeft = count - countRight
    if (countLeft > 0) {
        series.alterSamples(0, { yValues, offset: countRight })
        lastSampleIndex = countLeft - 1
    }

    // NOTE: Case not handled if remaining data would somehow immediately complete another full sweep.
}

// Push random data to chart every ~16 milliseconds (60 FPS)
let tLast = performance.now()
let dModulus = 0
let yPrev = 100
const streamRandomExampleData = () => {
    const tNow = performance.now()
    const tDelta = Math.min(tNow - tLast, 2000) // if tab is inactive for more than 2 seconds, prevent adding crazy amounts of data in attempt to catch up.
    let pointsToAdd = (tDelta * CONFIG.sampleRate) / 1000 + dModulus
    dModulus = pointsToAdd % 1
    pointsToAdd = Math.floor(pointsToAdd)
    tLast = tNow
    //
    const yValues = new Array(pointsToAdd)
    for (let i = 0; i < pointsToAdd; i += 1) {
        const y = yPrev + (Math.random() * 2 - 1)
        yPrev = y
        yValues[i] = y
    }
    handleIncomingData(yValues)
    //
    requestAnimationFrame(streamRandomExampleData)
}
streamRandomExampleData()
