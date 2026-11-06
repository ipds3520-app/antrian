export interface ReportColumn<T> {
    header: string
    value: (row: T) => string | number | null | undefined
}

function triggerDownload(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
}

function normalizeFilename(filename: string, extension: string): string {
    return filename.toLowerCase().endsWith(extension)
        ? filename
        : `${filename}${extension}`
}

function cellText<T>(column: ReportColumn<T>, row: T): string {
    const value = column.value(row)
    return value === null || value === undefined ? "" : String(value)
}

function escapeCsv(value: string): string {
    return `"${value.replace(/"/g, '""')}"`
}

export function downloadCsv<T>(
    filename: string,
    columns: ReportColumn<T>[],
    rows: T[],
) {
    const lines = [columns.map((column) => escapeCsv(column.header)).join(",")]

    for (const row of rows) {
        lines.push(
            columns.map((column) => escapeCsv(cellText(column, row))).join(","),
        )
    }

    const blob = new Blob([`\uFEFF${lines.join("\r\n")}`], {
        type: "text/csv;charset=utf-8;",
    })

    triggerDownload(blob, normalizeFilename(filename, ".csv"))
}

function escapeXml(value: string): string {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;")
}

function xmlCell<T>(column: ReportColumn<T>, row: T): string {
    const value = column.value(row)
    const isNumber = typeof value === "number" && Number.isFinite(value)

    return `<Cell><Data ss:Type="${isNumber ? "Number" : "String"}">${escapeXml(
        value === null || value === undefined ? "" : String(value),
    )}</Data></Cell>`
}

/**
 * Builds a SpreadsheetML 2003 workbook (`.xls`) which Excel and LibreOffice
 * open natively, without pulling in a spreadsheet dependency.
 */
export function downloadExcel<T>(
    filename: string,
    columns: ReportColumn<T>[],
    rows: T[],
    sheetName = "Laporan",
) {
    const header = `<Row>${columns
        .map(
            (column) =>
                `<Cell><Data ss:Type="String">${escapeXml(
                    column.header,
                )}</Data></Cell>`,
        )
        .join("")}</Row>`

    const body = rows
        .map(
            (row) =>
                `<Row>${columns
                    .map((column) => xmlCell(column, row))
                    .join("")}</Row>`,
        )
        .join("")

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Worksheet ss:Name="${escapeXml(sheetName)}">
  <Table>
   ${header}
   ${body}
  </Table>
 </Worksheet>
</Workbook>`

    const blob = new Blob([xml], {
        type: "application/vnd.ms-excel;charset=utf-8;",
    })

    triggerDownload(blob, normalizeFilename(filename, ".xls"))
}
