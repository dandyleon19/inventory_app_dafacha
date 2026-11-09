export interface TableHeader {
    title: string
    key: string
    sortable?: boolean
    class?: string
    /**
     * Phones and tablets show each row as a card. `title` and `subtitle` are the heading lines (several `title`
     * columns are joined, e.g. first name and last name), `hidden` leaves the column out; the rest are listed under
     * their header. `join` writes the value next to the previous column ("4 Jul, 2026 · 9:00 AM"). Without any
     * `title` the first plain column is the title.
     */
    card?: "title" | "subtitle" | "hidden" | "join"
    /** Only in the cards of phones and tablets, not a column of the table. */
    cardOnly?: boolean
}

export interface TableRowOption {
    title?: string
    icon: string
    action: string
    color: string
    class?: string
    /** A row with many actions keeps the primary ones visible and moves the rest behind a "more" button. */
    primary?: boolean
}

export interface FilterOption {
    type: "select" | "searchable-select" | "remote-select" | "multiselect" | "date"
    label: string
    key: string
    items: Array<any>
    multiple?: boolean
    /** remote-select: what is listed, searched on the server and loaded 20 at a time. */
    kind?: "supplier" | "category" | "company"
    /** remote-select: extra filters sent to the server. */
    query?: Record<string, string | number | boolean>
}

export interface TableChipColumn {
    key: string
    valueKey?: string
    color?: string | ((item: any) => string)
    icon?: string | ((item: any) => string)
    class?: string
    emptyText?: string
}