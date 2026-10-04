export interface TableHeader {
    title: string
    key: string
    sortable?: boolean
    class?: string
}

export interface TableRowOption {
    title?: string
    icon: string
    action: string
    color: string
    class?: string
}

export interface FilterOption {
    type: "select" | "searchable-select" | "multiselect" | "date"
    label: string
    key: string
    items: Array<any>
    multiple?: boolean
}

export interface TableChipColumn {
    key: string
    valueKey?: string
    color?: string | ((item: any) => string)
    icon?: string | ((item: any) => string)
    class?: string
    emptyText?: string
}