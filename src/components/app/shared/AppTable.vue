<template>
    <component :is="hidePageTitle ? 'div' : AppTableWrapper">
        <AppPageTitle
            v-if="!hidePageTitle"
            :title="title"
            :subtitle="subtitle"
            :total-items="totalItems"
        >
            <template v-if="showCreateButton || showExportButton" #actions>
                <v-btn
                    v-if="showExportButton"
                    class="app-table__btn-export"
                    color="primary"
                    variant="tonal"
                    size="large"
                    rounded="lg"
                    @click="$emit('handleExportButton')"
                >
                    <v-icon start>tabler:download</v-icon>
                    Exportar
                </v-btn>
                <v-btn
                    v-if="showCreateButton"
                    class="app-table__btn-primary"
                    color="primary"
                    variant="flat"
                    size="large"
                    rounded="lg"
                    @click="$emit('handleCreateButton')"
                >
                    <v-icon start>tabler:plus</v-icon>
                    Nuevo
                </v-btn>
            </template>
        </AppPageTitle>

        <v-card
            ref="tableCardRef"
            class="app-table"
            :class="{
                'app-table--scrolled-end': isScrolledToEnd,
                'app-table--cards': isCompact,
                'app-table--clickable': !!rowClickAction && !isCompact,
            }"
            rounded="xl"
            elevation="0"
        >
            <div class="app-table__toolbar">
                <div v-if="$slots.summary" class="app-table__summary">
                    <slot name="summary" />
                </div>
                <div class="app-table__toolbar-inner">
                    <v-text-field
                        v-if="showSearch"
                        v-model="search"
                        placeholder="Buscar en la tabla..."
                        prepend-inner-icon="tabler:search"
                        hide-details
                        density="comfortable"
                        variant="solo-filled"
                        flat
                        rounded="lg"
                        clearable
                        class="app-table__search"
                    />

                    <button
                        v-if="isCompact && filters.length"
                        type="button"
                        class="app-table__filters-toggle"
                        :aria-expanded="filtersOpen"
                        @click="filtersOpen = !filtersOpen"
                    >
                        <v-icon size="18">tabler:adjustments-horizontal</v-icon>
                        <span>Filtros</span>
                        <span v-if="activeFiltersCount" class="app-table__filters-count">{{ activeFiltersCount }}</span>
                        <v-icon size="18" class="app-table__filters-chevron">
                            {{ filtersOpen ? "tabler:chevron-up" : "tabler:chevron-down" }}
                        </v-icon>
                    </button>

                    <div v-show="!isCompact || filtersOpen" class="app-table__filters">
                    <template v-for="filter in filters" :key="filter.key">
                        <RemoteSelect
                            v-if="filter.type === 'remote-select' && filter.kind"
                            v-model="selectedFilters[filter.key]"
                            :kind="filter.kind"
                            :label="filter.label"
                            :query="filter.query"
                            hide-details
                            density="comfortable"
                            variant="solo-filled"
                            flat
                            rounded="lg"
                            class="app-table__filter"
                        />

                        <v-select
                            v-else-if="filter.type === 'select'"
                            v-model="selectedFilters[filter.key]"
                            :label="filter.label"
                            :items="filter.items"
                            hide-details
                            density="comfortable"
                            variant="solo-filled"
                            flat
                            rounded="lg"
                            clearable
                            class="app-table__filter"
                        />

                        <v-autocomplete
                            v-else-if="filter.type === 'searchable-select'"
                            v-model="selectedFilters[filter.key]"
                            :label="filter.label"
                            :items="filter.items"
                            item-title="title"
                            item-value="value"
                            hide-details
                            density="comfortable"
                            variant="solo-filled"
                            flat
                            rounded="lg"
                            clearable
                            no-data-text="Sin coincidencias"
                            class="app-table__filter"
                        />

                        <v-select
                            v-else-if="filter.type === 'multiselect'"
                            v-model="selectedFilters[filter.key]"
                            :label="filter.label"
                            :items="filter.items"
                            multiple
                            clearable
                            hide-details
                            density="comfortable"
                            variant="solo-filled"
                            flat
                            rounded="lg"
                            class="app-table__filter"
                        />

                        <v-text-field
                            v-else-if="filter.type === 'date'"
                            v-model="selectedFilters[filter.key]"
                            :label="filter.label"
                            type="date"
                            hide-details
                            density="comfortable"
                            variant="solo-filled"
                            flat
                            rounded="lg"
                            clearable
                            class="app-table__filter"
                        />
                    </template>
                    </div>
                </div>
            </div>

            <div class="app-table__body">
                <v-data-table-server
                    class="app-table__data"
                    :class="{ 'app-table__data--wide-first': wideFirstColumn || !firstColumnIsIndex }"
                    :headers="tableHeaders"
                    :items="items"
                    :items-length="totalItems"
                    :loading="loading"
                    :search="tableSearch"
                    :items-per-page="props.itemsPerPage"
                    :items-per-page-options="[10, 25, 50, 100]"
                    :page="props.page"
                    :item-class="itemClass"
                    :hide-default-header="isCompact"
                    hover
                    @update:options="handleOptionsUpdate"
                    @click:row="handleRowClick"
                >
                    <!-- Phones and tablets: one card per row (the footer with the pagination stays the same). -->
                    <template v-if="isCompact" #body="{ items: cardEntries }">
                        <tr v-if="loading">
                            <td class="app-table__cards-cell">
                                <div class="app-cards" aria-busy="true">
                                    <div v-for="n in 3" :key="n" class="app-card">
                                        <v-skeleton-loader type="list-item-two-line, text" />
                                    </div>
                                </div>
                            </td>
                        </tr>
                        <tr v-else-if="!cardEntries.length">
                            <td class="app-table__cards-cell">
                                <div class="app-table__state app-table__state--empty">
                                    <div class="app-table__state-icon app-table__state-icon--muted">
                                        <v-icon size="26">tabler:search</v-icon>
                                    </div>
                                    <p class="text-subtitle-2 font-weight-medium mb-1">{{ emptyTitle }}</p>
                                    <p class="text-body-2 text-medium-emphasis mb-0">
                                        {{ emptyText }}
                                    </p>
                                </div>
                            </td>
                        </tr>
                        <tr v-else>
                            <td class="app-table__cards-cell">
                                <div class="app-cards">
                                    <article
                                        v-for="(item, index) in toRawItems(cardEntries)"
                                        :key="item.id ?? index"
                                        class="app-card"
                                        :class="resolveItemClass(item)"
                                    >
                                        <header class="app-card__head">
                                            <div class="app-card__heading">
                                                <div class="app-card__title">
                                                    <slot
                                                        v-if="cardTitleSlotKey"
                                                        :name="`item.${cardTitleSlotKey}`"
                                                        :item="item"
                                                        :index="index"
                                                        :value="item[cardTitleSlotKey]"
                                                    />
                                                    <template v-else>{{ cardTitleText(item) }}</template>
                                                </div>
                                                <p v-if="cardSubtitleText(item)" class="app-card__subtitle">
                                                    {{ cardSubtitleText(item) }}
                                                </p>
                                            </div>
                                            <v-chip
                                                v-if="cardBadge(item)"
                                                size="small"
                                                variant="tonal"
                                                :color="resolveChipColor(item, cardBadge(item))"
                                                :prepend-icon="resolveChipIcon(item, cardBadge(item))"
                                                :class="['app-table__chip', cardBadge(item)?.class]"
                                            >
                                                {{ resolveChipValue(item, cardBadge(item)) }}
                                            </v-chip>
                                        </header>

                                        <div v-if="cardChips(item).length" class="app-card__chips">
                                            <v-chip
                                                v-for="chip in cardChips(item)"
                                                :key="chip.key"
                                                size="small"
                                                variant="tonal"
                                                :color="resolveChipColor(item, chip)"
                                                :prepend-icon="resolveChipIcon(item, chip)"
                                                :class="['app-table__chip', chip.class]"
                                            >
                                                {{ resolveChipValue(item, chip) }}
                                            </v-chip>
                                        </div>

                                        <dl v-if="cardMeta(item).length" class="app-card__meta">
                                            <div
                                                v-for="entry in cardMeta(item)"
                                                :key="entry.header.key"
                                                :class="{ 'app-card__meta-wide': isLongCardValue(item, entry) }"
                                            >
                                                <dt>{{ entry.header.title }}</dt>
                                                <dd>
                                                    <slot
                                                        v-if="cardMetaUsesSlot(entry)"
                                                        :name="`item.${entry.header.key}`"
                                                        :item="item"
                                                        :index="index"
                                                        :value="item[entry.header.key]"
                                                    />
                                                    <template v-else>{{ cardMetaText(item, entry) }}</template>
                                                </dd>
                                            </div>
                                        </dl>

                                        <footer v-if="rowLayout(item).visible.length" class="app-card__actions">
                                            <template
                                                v-for="(rowOption, optionIndex) in rowLayout(item).visible"
                                                :key="rowOption.action"
                                            >
                                                <button
                                                    v-if="optionIndex === 0"
                                                    type="button"
                                                    :class="[
                                                        'app-table__action',
                                                        `app-table__action--${rowOption.color}`,
                                                        'app-card__primary',
                                                        rowOption.class,
                                                    ]"
                                                    @click="$emit('handleRowActionButton', item, rowOption.action)"
                                                >
                                                    <v-icon size="18">{{ rowOption.icon }}</v-icon>
                                                    {{ rowOption.title || getActionLabel(rowOption.action) }}
                                                </button>
                                                <button
                                                    v-else
                                                    type="button"
                                                    :class="[
                                                        'app-table__action',
                                                        `app-table__action--${rowOption.color}`,
                                                        'app-card__icon',
                                                        rowOption.class,
                                                    ]"
                                                    :aria-label="rowOption.title || getActionLabel(rowOption.action)"
                                                    @click="$emit('handleRowActionButton', item, rowOption.action)"
                                                >
                                                    <v-icon size="18">{{ rowOption.icon }}</v-icon>
                                                </button>
                                            </template>
                                            <button
                                                v-if="rowLayout(item).overflow.length"
                                                type="button"
                                                class="app-table__action app-card__icon app-table__action--more"
                                                aria-label="Más acciones"
                                                @click="openActionsMenu(item, $event)"
                                            >
                                                <v-icon size="18">tabler:dots-vertical</v-icon>
                                            </button>
                                        </footer>
                                    </article>
                                </div>
                            </td>
                        </tr>
                    </template>

                    <template #loading>
                        <AppSkeletonTransition>
                            <AppTableSkeleton
                                key="table-skeleton"
                                :columns="skeletonColumns"
                                :rows="skeletonRows"
                            />
                        </AppSkeletonTransition>
                    </template>

                    <template v-if="!$slots['item.id']" v-slot:[`item.id`]="{ index }">
                        <span class="app-table__row-num">{{ rowNumber(index) }}</span>
                    </template>

                    <template
                        v-for="chip in chipColumns"
                        :key="`chip-${chip.key}`"
                        v-slot:[`item.${chip.key}`]="{ item }"
                    >
                        <v-chip
                            v-if="resolveChipValue(item, chip)"
                            size="small"
                            variant="tonal"
                            :color="resolveChipColor(item, chip)"
                            :prepend-icon="resolveChipIcon(item, chip)"
                            :class="['app-table__chip', chip.class]"
                            :title="resolveChipValue(item, chip)"
                        >
                            {{ resolveChipValue(item, chip) }}
                        </v-chip>
                        <span v-else class="text-medium-emphasis">
                            {{ chip.emptyText ?? "—" }}
                        </span>
                    </template>

                    <template
                        v-for="header in customHeaderSlots"
                        :key="`custom-${header.key}`"
                        v-slot:[`item.${header.key}`]="slotData"
                    >
                        <slot :name="`item.${header.key}`" v-bind="slotData" />
                    </template>

                    <template
                        v-for="columnKey in defaultCellColumns"
                        :key="`cell-${columnKey}`"
                        v-slot:[`item.${columnKey}`]="{ item }"
                    >
                        <span
                            :class="{
                                'app-table__empty-cell text-medium-emphasis':
                                    isEmptyCellValue(item[columnKey]),
                            }"
                        >
                            {{ formatCellValue(item[columnKey]) }}
                        </span>
                    </template>

                <template v-if="!$slots['item.actions']" v-slot:[`item.actions`]="{ item }">
                    <div class="app-table__actions">
                        <v-tooltip
                            v-for="rowOption in rowLayout(item).visible"
                            :key="rowOption.action"
                            :text="rowOption.title || getActionLabel(rowOption.action)"
                            location="top"
                        >
                            <template #activator="{ props: tooltipProps }">
                                <button
                                    v-bind="tooltipProps"
                                    type="button"
                                    :class="[
                                        'app-table__action',
                                        `app-table__action--${rowOption.color}`,
                                        rowOption.class,
                                    ]"
                                    @click="$emit('handleRowActionButton', item, rowOption.action)"
                                >
                                    <v-icon size="18">{{ rowOption.icon }}</v-icon>
                                </button>
                            </template>
                        </v-tooltip>
                        <button
                            v-if="rowLayout(item).overflow.length"
                            type="button"
                            class="app-table__action app-table__action--more"
                            aria-label="Más acciones"
                            @click.stop="openActionsMenu(item, $event)"
                        >
                            <v-icon size="18">tabler:dots-vertical</v-icon>
                        </button>
                    </div>
                </template>
                <template v-else v-slot:[`item.actions`]="slotData">
                    <slot name="item.actions" v-bind="slotData" />
                </template>

                <template #no-data>
                    <div
                        v-if="!loading"
                        class="app-table__state app-table__state--empty"
                    >
                        <div class="app-table__state-icon app-table__state-icon--muted">
                            <v-icon size="26">tabler:search</v-icon>
                        </div>
                        <p class="text-subtitle-2 font-weight-medium mb-1">{{ emptyTitle }}</p>
                        <p class="text-body-2 text-medium-emphasis mb-0">
                            {{ emptyText }}
                        </p>
                    </div>
                </template>
                </v-data-table-server>
            </div>
        </v-card>

        <!-- Phones and tablets: the actions that do not fit in the row, with their names. -->
        <v-bottom-sheet v-model="actionsSheetOpen" content-class="app-table__sheet">
            <v-card rounded="t-xl" class="app-table__sheet-card">
                <v-card-title class="app-table__sheet-title">Más acciones</v-card-title>
                <v-list class="app-table__sheet-list">
                    <v-list-item
                        v-for="rowOption in sheetOptions"
                        :key="rowOption.action"
                        :title="rowOption.title || getActionLabel(rowOption.action)"
                        class="app-table__sheet-item"
                        @click="chooseSheetAction(rowOption.action)"
                    >
                        <template #prepend>
                            <v-icon :color="rowOption.color" size="22">{{ rowOption.icon }}</v-icon>
                        </template>
                    </v-list-item>
                </v-list>
            </v-card>
        </v-bottom-sheet>

        <!-- Wide screens: the same actions in a menu next to the button. -->
        <v-menu v-model="actionsMenuOpen" :target="menuTarget" location="bottom end">
            <v-list class="app-table__menu-list" density="comfortable">
                <v-list-item
                    v-for="rowOption in sheetOptions"
                    :key="rowOption.action"
                    :title="rowOption.title || getActionLabel(rowOption.action)"
                    @click="chooseSheetAction(rowOption.action)"
                >
                    <template #prepend>
                        <v-icon :color="rowOption.color" size="20">{{ rowOption.icon }}</v-icon>
                    </template>
                </v-list-item>
            </v-list>
        </v-menu>
    </component>
</template>

<script setup lang="ts">
import { ref, useSlots, computed, watch, onMounted, onBeforeUnmount, nextTick } from "vue";
import { useDisplay } from "vuetify";
import AppTableWrapper from "~/components/app/shared/AppTableWrapper.vue";
import type { TableHeader, FilterOption, TableRowOption, TableChipColumn } from "~/interfaces/tableInterfaces";
import { normalizeTableSearch } from "~/helpers/tableSearchHelpers";

const slots = useSlots();

const hasCustomCellSlot = (key: string) => Boolean(slots[`item.${key}`])

const customHeaderSlots = computed(() =>
    props.headers.filter((header) => hasCustomCellSlot(header.key))
)

const EMPTY_CELL_TEXT = "—"

const chipColumnKeys = computed(
    () => new Set(props.chipColumns.map((chip) => chip.key))
)

const defaultCellColumns = computed(() =>
    props.headers
        .map((header) => header.key)
        .filter(
            (key) =>
                key !== "id" &&
                key !== "actions" &&
                !chipColumnKeys.value.has(key) &&
                !hasCustomCellSlot(key)
        )
)

const isEmptyCellValue = (value: unknown) => {
    if (value == null || value === "") return true
    if (typeof value === "string" && value.trim() === "") return true
    return false
}

const formatCellValue = (value: unknown) => {
    if (isEmptyCellValue(value)) return EMPTY_CELL_TEXT
    return String(value)
}

const ACTION_BUTTON_SIZE = 34
const ACTION_BUTTON_GAP = 6
const ACTION_CELL_PADDING = 32
const MIN_ACTIONS_COLUMN_COUNT = 3

const getActionsColumnWidth = (actionCount: number) => {
    const count = Math.max(actionCount, MIN_ACTIONS_COLUMN_COUNT)
    return (
        ACTION_CELL_PADDING +
        count * ACTION_BUTTON_SIZE +
        Math.max(0, count - 1) * ACTION_BUTTON_GAP
    )
}

const props = withDefaults(
    defineProps<{
        title: string;
        subtitle?: string;
        headers: TableHeader[];
        rowOptions: TableRowOption[];
        items: any[];
        totalItems: number;
        filters?: FilterOption[];
        /** Values the filters start with (by filter key), e.g. when a link arrives with a filter already applied. */
        initialFilters?: Record<string, any>;
        /** Shown when the table has no rows; override when "no results for your filters" isn't the right message. */
        emptyTitle?: string;
        emptyText?: string;
        page: number;
        itemsPerPage: number;
        loading?: boolean;
        showCreateButton?: boolean;
        showExportButton?: boolean;
        showSearch?: boolean;
        serverSearch?: boolean;
        hidePageTitle?: boolean;
        /** Forces the first column uncapped. Not needed unless the first header is `id` but holds text: any other first column is already uncapped. */
        wideFirstColumn?: boolean;
        chipColumns?: TableChipColumn[];
        itemClass?: string | ((item: Record<string, unknown>) => string);
        getRowOptions?: (item: Record<string, unknown>) => TableRowOption[];
        /** Clicking a row runs this action (when the row has it), as if its button had been pressed. */
        rowClickAction?: string;
    }>(),
    {
        subtitle: "",
        rowOptions: () => [],
        filters: () => [],
        initialFilters: () => ({}),
        emptyTitle: "Sin resultados",
        emptyText: "No se encontraron registros con los filtros actuales",
        loading: false,
        showCreateButton: true,
        showExportButton: true,
        showSearch: true,
        serverSearch: false,
        hidePageTitle: false,
        wideFirstColumn: false,
        chipColumns: () => [],
        itemClass: undefined,
        getRowOptions: undefined,
    }
);

const resolveRowOptions = (item: Record<string, unknown>) =>
    props.getRowOptions ? props.getRowOptions(item) : props.rowOptions

// Phones and tablets (the same width where the sidebar turns into a drawer) get a list of cards instead of the table.
const display = useDisplay()
const isCompact = computed(() => display.mdAndDown.value)

// A row (or a card) with more than three actions keeps the primary ones (the flagged ones, or else the first two) and
// the others go behind a "more" button: a sheet on phones and tablets, a menu on wide screens. The flagged actions
// lead, the first one being the labelled button of a card.
const MAX_ACTIONS_IN_ROW = 3
const ACTIONS_KEPT_WHEN_FOLDED = 2

const splitRowOptions = (options: TableRowOption[]) => {
    const flagged = options.filter((option) => option.primary)
    const ordered = flagged.length ? [...flagged, ...options.filter((option) => !option.primary)] : options

    if (options.length <= MAX_ACTIONS_IN_ROW) {
        return { visible: ordered, overflow: [] as TableRowOption[] }
    }

    const visible = (flagged.length ? flagged : options).slice(0, ACTIONS_KEPT_WHEN_FOLDED)
    return { visible, overflow: ordered.filter((option) => !visible.includes(option)) }
}

const rowLayout = (item: Record<string, unknown>) => splitRowOptions(resolveRowOptions(item))

// Buttons a row shows, the "more" button included: what the width of the actions column is made for.
const layoutButtonCount = (options: TableRowOption[]) => {
    const { visible, overflow } = splitRowOptions(options)
    return visible.length + (overflow.length ? 1 : 0)
}

const maxRowActionsCount = computed(() => {
    const staticCount = layoutButtonCount(props.rowOptions)

    if (!props.getRowOptions || props.items.length === 0) {
        return Math.max(staticCount, MIN_ACTIONS_COLUMN_COUNT)
    }

    const dynamicMax = Math.max(
        ...props.items.map((item) => layoutButtonCount(resolveRowOptions(item))),
        staticCount
    )

    return Math.max(dynamicMax, MIN_ACTIONS_COLUMN_COUNT)
})

// A click on a row (not on something inside it, like a button or a link) runs the page's main action for it.
const handleRowClick = (event: Event, payload: { item: any }) => {
    if (!props.rowClickAction || isCompact.value) return
    if ((event.target as HTMLElement | null)?.closest("button, a, input, label, .v-chip--link")) return

    const item = payload?.item?.raw ?? payload?.item
    if (!item || !resolveRowOptions(item).some((option) => option.action === props.rowClickAction)) return

    emit("handleRowActionButton", item, props.rowClickAction)
}

// What each card shows, from the headers: the title (and subtitle) lines, the status as a badge, the other chips and
// the remaining columns as "label: value" pairs. A header can say its role with `card`.
const cardColumns = computed(() => {
    const data = props.headers.filter(
        (header) => header.key !== "id" && header.key !== "actions" && header.card !== "hidden"
    )
    const isChip = (header: TableHeader) => chipColumnKeys.value.has(header.key)

    const flaggedTitles = data.filter((header) => header.card === "title")
    const titles = flaggedTitles.length ? flaggedTitles : data.filter((header) => !isChip(header)).slice(0, 1)
    const subtitles = data.filter((header) => header.card === "subtitle" && !titles.includes(header))
    const rest = data.filter((header) => !titles.includes(header) && !subtitles.includes(header))
    const chips = rest.filter(isChip)
    const badge = chips.find((header) => /status/i.test(header.key)) ?? null

    // A column flagged "join" is written next to the one before it.
    const meta: Array<{ header: TableHeader; joined: TableHeader[] }> = []
    for (const header of rest.filter((candidate) => !isChip(candidate))) {
        const previous = meta[meta.length - 1]
        if (header.card === "join" && previous) previous.joined.push(header)
        else meta.push({ header, joined: [] })
    }

    return {
        titles,
        subtitles,
        badge,
        chips: chips.filter((header) => header !== badge),
        meta,
    }
})

// A single title column with its own slot (a client with the phone below, say) is drawn with that slot.
const cardTitleSlotKey = computed(() => {
    const [only, ...others] = cardColumns.value.titles
    return only && !others.length && hasCustomCellSlot(only.key) ? only.key : null
})

const joinCardValues = (item: Record<string, any>, headers: TableHeader[], separator: string) =>
    headers
        .map((header) => item[header.key])
        .filter((value) => !isEmptyCellValue(value) && value !== EMPTY_CELL_TEXT)
        .join(separator)

const cardTitleText = (item: Record<string, any>) =>
    joinCardValues(item, cardColumns.value.titles, " ") || EMPTY_CELL_TEXT

const cardSubtitleText = (item: Record<string, any>) => joinCardValues(item, cardColumns.value.subtitles, " · ")

const chipOf = (header: TableHeader) => props.chipColumns.find((chip) => chip.key === header.key)

const cardChipsOf = (item: Record<string, any>, headers: TableHeader[]) =>
    headers
        .map(chipOf)
        .filter((chip): chip is TableChipColumn => !!chip && !!resolveChipValue(item, chip))

const cardBadge = (item: Record<string, any>) =>
    cardChipsOf(item, cardColumns.value.badge ? [cardColumns.value.badge] : [])[0] ?? null

const cardChips = (item: Record<string, any>) => cardChipsOf(item, cardColumns.value.chips)

type CardMetaEntry = { header: TableHeader; joined: TableHeader[] }

const cardMetaText = (item: Record<string, any>, entry: CardMetaEntry) =>
    joinCardValues(item, [entry.header, ...entry.joined], " · ")

// A column with its own slot is drawn with it, unless other columns were joined to it.
const cardMetaUsesSlot = (entry: CardMetaEntry) => hasCustomCellSlot(entry.header.key) && !entry.joined.length

// Empty values are left out of the card: it is a summary, the edit form has everything.
const cardMeta = (item: Record<string, any>) =>
    cardColumns.value.meta.filter((entry) => cardMetaUsesSlot(entry) || cardMetaText(item, entry) !== "")

// A long value (an email, a long name) gets the whole width instead of breaking in the middle of a word.
const LONG_CARD_VALUE_LENGTH = 24
const isLongCardValue = (item: Record<string, any>, entry: CardMetaEntry) =>
    !cardMetaUsesSlot(entry) && cardMetaText(item, entry).length > LONG_CARD_VALUE_LENGTH

const toRawItems = (entries: any[]) =>
    entries.map((entry) => (entry && typeof entry === "object" && "raw" in entry ? entry.raw : entry))

const resolveItemClass = (item: Record<string, unknown>) =>
    typeof props.itemClass === "function" ? props.itemClass(item) : props.itemClass

const actionsSheetOpen = ref(false)
const actionsMenuOpen = ref(false)
const menuTarget = ref<HTMLElement | null>(null)
const sheetItem = ref<Record<string, unknown> | null>(null)
const sheetOptions = computed(() => (sheetItem.value ? rowLayout(sheetItem.value).overflow : []))

const openActionsMenu = (item: Record<string, unknown>, event?: Event) => {
    sheetItem.value = item

    if (isCompact.value) {
        actionsSheetOpen.value = true
        return
    }

    menuTarget.value = (event?.currentTarget as HTMLElement | null) ?? null
    actionsMenuOpen.value = true
}

const chooseSheetAction = (action: string) => {
    const item = sheetItem.value
    actionsSheetOpen.value = false
    actionsMenuOpen.value = false
    if (item) emit("handleRowActionButton", item, action)
}

const actionsColumnWidth = computed(() =>
    getActionsColumnWidth(maxRowActionsCount.value)
)

const actionsColumnWidthPx = computed(() => `${actionsColumnWidth.value}px`)

const SCROLL_END_EPSILON = 4

const tableCardRef = ref<{ $el: HTMLElement } | null>(null)
const isScrolledToEnd = ref(true)
let tableScrollEl: HTMLElement | null = null
let tableResizeObserver: ResizeObserver | null = null

const updateScrolledToEnd = () => {
    if (!tableScrollEl) return
    const { scrollLeft, scrollWidth, clientWidth } = tableScrollEl
    isScrolledToEnd.value =
        scrollWidth - clientWidth <= SCROLL_END_EPSILON ||
        scrollLeft + clientWidth >= scrollWidth - SCROLL_END_EPSILON
}

onMounted(() => {
    tableScrollEl = tableCardRef.value?.$el?.querySelector(".v-table__wrapper") ?? null
    tableScrollEl?.addEventListener("scroll", updateScrolledToEnd, { passive: true })

    if (tableScrollEl && typeof ResizeObserver !== "undefined") {
        tableResizeObserver = new ResizeObserver(updateScrolledToEnd)
        tableResizeObserver.observe(tableScrollEl)
    }

    updateScrolledToEnd()
})

onBeforeUnmount(() => {
    tableScrollEl?.removeEventListener("scroll", updateScrolledToEnd)
    tableResizeObserver?.disconnect()
})

watch(
    () => [props.items, props.headers],
    () => nextTick(updateScrolledToEnd)
)

/**
 * The first column is capped at 80px because it is normally the row number (the `id` header, shown as "N°").
 * When it holds text (a product, a SKU, a date) the cap would cut it, so it is only applied to the number column.
 */
const firstColumnIsIndex = computed(() => props.headers[0]?.key === "id")

const tableHeaders = computed(() =>
    props.headers.filter((header) => !header.cardOnly).map((header) => {
        if (header.key === "id") {
            return {
                ...header,
                title: "N°",
                sortable: false,
                width: 64,
                minWidth: 64,
                maxWidth: 72,
            }
        }

        if (header.key === "actions") {
            const width = actionsColumnWidth.value

            return {
                ...header,
                sortable: false,
                align: "end",
                width,
                minWidth: width,
            }
        }

        return header
    })
);

const rowNumber = (index: number) =>
    (props.page - 1) * props.itemsPerPage + index + 1;

const skeletonColumns = computed(() => Math.max(props.headers.length, 4))

const skeletonRows = 1

const emit = defineEmits<{
    (e: "handleCreateButton"): void
    (e: "handleExportButton"): void
    (e: "handleRowActionButton", item: any, action: string): void
    (e: "handleUpdateFilters", values: Record<string, any>): void,
    (e: "handleUpdateSearch", value: string): void,
    (e: "update:pagination", value: {
      page: number,
      itemsPerPage: number
    }): void
}>()

const search = ref("");

const tableSearch = computed(() => {
    if (!props.showSearch || props.serverSearch) return undefined
    return search.value
});
const selectedFilters = ref<Record<string, any>>({ ...props.initialFilters })

// Phones and tablets: the filters are folded behind a "Filtros" button that says how many are applied.
const filtersOpen = ref(false)
const activeFiltersCount = computed(
    () =>
        Object.values(selectedFilters.value).filter(
            (value) => value != null && value !== "" && !(Array.isArray(value) && value.length === 0)
        ).length
)

const SEARCH_DEBOUNCE_MS = 300
let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null

watch(search, (value) => {
    if (!props.serverSearch) return

    if (searchDebounceTimer) {
        clearTimeout(searchDebounceTimer)
    }

    searchDebounceTimer = setTimeout(() => {
        emit("handleUpdateSearch", normalizeTableSearch(value))
    }, SEARCH_DEBOUNCE_MS)
})

onBeforeUnmount(() => {
    if (searchDebounceTimer) {
        clearTimeout(searchDebounceTimer)
    }
})

const actionLabels: Record<string, string> = {
    update: "Editar",
    delete: "Eliminar",
    subscription: "Suscripción",
    password: "Restablecer contraseña",
    view: "Ver detalle",
    branches: "Sucursales",
    products: "Productos",
    services: "Servicios",
    clinicalRecords: "Historial clínico",
    changePassword: "Cambiar contraseña",
}

const getActionLabel = (action: string) => actionLabels[action] ?? action

const resolveChipValue = (item: any, chip: TableChipColumn) => {
    const value = item?.[chip.valueKey ?? chip.key]
    if (value == null || value === "" || value === "—") return ""
    return String(value)
}

const resolveChipColor = (item: any, chip: TableChipColumn) => {
    if (typeof chip.color === "function") return chip.color(item)
    return chip.color
}

const resolveChipIcon = (item: any, chip: TableChipColumn) => {
    if (!chip.icon) return undefined
    if (typeof chip.icon === "function") return chip.icon(item)
    return chip.icon
}

const lastPagination = ref<{ page: number; itemsPerPage: number } | null>(null)

const handleOptionsUpdate = (options: { page: number; itemsPerPage: number }) => {
  const next = {
    page: options.page,
    itemsPerPage: options.itemsPerPage,
  }

  if (
    lastPagination.value?.page === next.page &&
    lastPagination.value?.itemsPerPage === next.itemsPerPage
  ) {
    return
  }

  lastPagination.value = next
  emit("update:pagination", next)
}

watch(selectedFilters, (val) => {
    emit("handleUpdateFilters", val)
}, { deep: true })
</script>

<style scoped>
.app-table__btn-primary {
    color: #14110F !important;
    text-transform: none;
    letter-spacing: normal;
    box-shadow: 0 4px 14px rgba(var(--v-theme-primary), 0.28);
}

.app-table__btn-export {
    text-transform: none;
    letter-spacing: normal;
    color: var(--ink-primary) !important;
    background: rgba(var(--v-theme-primary), 0.08) !important;
    border: 1px solid rgba(var(--v-theme-primary), 0.18) !important;
}

.app-table__btn-export :deep(.v-btn__content),
.app-table__btn-export :deep(.v-icon) {
    color: var(--ink-primary) !important;
}

.app-table {
    border: 1px solid rgba(var(--v-border-color), 0.12);
    overflow: hidden;
    background: rgb(var(--v-theme-background));
    width: 100%;
    box-shadow:
        0 1px 2px rgba(15, 23, 42, 0.04),
        0 12px 32px rgba(15, 23, 42, 0.06);
}

.app-table__toolbar {
    padding: 1rem 1.25rem;
    background:
        linear-gradient(
            180deg,
            rgba(var(--v-theme-primary), 0.045) 0%,
            rgba(var(--v-theme-background), 1) 100%
        );
    border-bottom: 1px solid rgba(var(--v-border-color), 0.1);
}

/* Optional row above the search with quick filters / counts (slot "summary"). */
.app-table__summary {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.875rem;
    padding-bottom: 0.875rem;
    border-bottom: 1px dashed rgba(var(--v-border-color), 0.12);
}

.app-table__toolbar-inner {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.75rem;
}

.app-table__body {
    position: relative;
    min-height: 280px;
}

.app-table__data {
    width: 100%;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    background: rgb(var(--v-theme-background));
}

.app-table__data :deep(.v-table) {
    width: 100%;
    min-width: min(100%, 720px);
    table-layout: auto;
    background: transparent;
}

.app-table__data :deep(.v-data-table__tbody td:not(:last-child)),
.app-table__data :deep(.v-data-table__thead th:not(:last-child)) {
    max-width: 320px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.app-table__data :deep(.v-data-table__tbody td:not(:last-child):not(:first-child):not(:has(.app-table__actions)):not(:has(.app-table__chip))) {
    max-width: 150px;
    white-space: normal;
    overflow: visible;
    text-overflow: clip;
    overflow-wrap: break-word;
}

.app-table__data :deep(.v-data-table__tbody td:has(.app-table__chip)) {
    overflow: visible;
    text-overflow: clip;
    white-space: normal;
    min-width: 6.5rem;
}

.app-table__data :deep(.v-data-table__tbody td:has(.app-table__chip--branch)) {
    min-width: 130px;
}

.app-table__data :deep(.v-data-table__tbody td:has(.app-table__chip--service)) {
    min-width: 150px;
}

/* A branch or a service is one line (the full name is the tooltip of the chip), not a tall wrapped block. */
.app-table__data :deep(.app-table__chip--branch) {
    max-width: 148px;
    text-align: left;
}

.app-table__data :deep(.app-table__chip--service) {
    max-width: 160px;
    text-align: left;
}

.app-table__data :deep(.app-table__chip--branch .v-chip__content),
.app-table__data :deep(.app-table__chip--service .v-chip__content) {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

/* Snugger columns between the first and the last one: more of the table fits without scrolling sideways. */
.app-table__data :deep(.v-data-table__tbody td:not(:first-child):not(:last-child)),
.app-table__data :deep(.v-data-table__thead th:not(:first-child):not(:last-child)) {
    padding-inline: 0.625rem;
}

.app-table--clickable .app-table__data :deep(.v-data-table__tbody tr) {
    cursor: pointer;
}

.app-table__menu-list {
    min-width: 12rem;
}

/* In a card the name of a branch or service is shown whole. */
.app-table--cards .app-table__data :deep(.app-card .app-table__chip) {
    max-width: 100%;
    height: auto;
    min-height: 1.5rem;
}

.app-table--cards .app-table__data :deep(.app-card .app-table__chip .v-chip__content) {
    display: inline-flex;
    overflow: visible;
    text-overflow: clip;
    white-space: normal;
    overflow-wrap: anywhere;
    line-height: 1.2;
    padding-block: 0.15rem;
}

.app-table__data :deep(.v-data-table__tbody td:has(.appointment-client-cell)) {
    overflow: visible;
    text-overflow: clip;
    white-space: normal;
}

.app-table__chip {
    font-weight: 500;
    letter-spacing: normal;
}

.app-table__chip--branch :deep(.v-chip__underlay),
.app-table__chip--branch {
    background: rgba(79, 195, 247, 0.16) !important;
    color: #0277bd !important;
}

.app-table__chip--service :deep(.v-chip__underlay),
.app-table__chip--service {
    background: rgba(126, 87, 194, 0.14) !important;
    color: #5e35b1 !important;
}

.app-table__data :deep(.v-data-table__tbody td:first-child),
.app-table__data :deep(.v-data-table__thead th:first-child) {
    max-width: 80px;
    width: 72px;
    padding-left: 1.25rem !important;
}

.app-table__data--wide-first :deep(.v-data-table__tbody td:first-child),
.app-table__data--wide-first :deep(.v-data-table__thead th:first-child) {
    width: auto;
    min-width: max-content;
    max-width: none;
    white-space: nowrap;
    overflow: visible;
    text-overflow: clip;
}

.app-table__data :deep(.v-data-table__tbody td:last-child),
.app-table__data :deep(.v-data-table__thead th:last-child) {
    width: auto !important;
    min-width: fit-content;
    max-width: none !important;
    white-space: nowrap;
    overflow: visible;
    text-overflow: clip;
    padding-right: 1.25rem !important;
}

.app-table__data :deep(.v-data-table__tbody td:has(.app-table__actions)),
.app-table__data :deep(.v-data-table__thead th:has(.app-table__actions)) {
    width: v-bind(actionsColumnWidthPx) !important;
    min-width: v-bind(actionsColumnWidthPx) !important;
    max-width: v-bind(actionsColumnWidthPx) !important;
    white-space: nowrap;
    overflow: visible;
    position: sticky;
    right: 0;
    z-index: 2;
    transition: box-shadow 0.25s ease;
}

.app-table__data :deep(.v-data-table__thead th:has(.app-table__actions)) {
    background: rgb(var(--v-theme-surface)) !important;
    z-index: 3;
    box-shadow: -8px 0 12px -4px rgba(var(--v-theme-on-surface), 0.18);
}

.app-table__data :deep(.v-data-table__tbody td:has(.app-table__actions)) {
    background: rgb(var(--v-theme-background));
    box-shadow: -8px 0 12px -4px rgba(var(--v-theme-on-surface), 0.14);
}

.app-table__data :deep(.v-data-table__tbody tr:nth-child(even) td:has(.app-table__actions)) {
    background: color-mix(in srgb, rgb(var(--v-theme-on-surface)) 1.8%, rgb(var(--v-theme-background)));
}

.app-table__data :deep(.v-data-table__tbody tr:hover td:has(.app-table__actions)) {
    background: color-mix(in srgb, rgb(var(--v-theme-primary)) 5%, rgb(var(--v-theme-background))) !important;
}

.app-table--scrolled-end .app-table__data :deep(.v-data-table__thead th:has(.app-table__actions)),
.app-table--scrolled-end .app-table__data :deep(.v-data-table__tbody td:has(.app-table__actions)) {
    box-shadow: none;
}

.app-table__search {
    min-width: 240px;
    max-width: 320px;
    flex: 1 1 240px;
}

.app-table__filter {
    min-width: 170px;
    max-width: 220px;
    flex: 1 1 170px;
}

.app-table__search :deep(.v-field),
.app-table__filter :deep(.v-field) {
    background: rgba(var(--v-theme-surface), 0.65) !important;
    box-shadow: inset 0 0 0 1px rgba(var(--v-border-color), 0.14);
    transition: box-shadow 0.2s ease, background-color 0.2s ease;
}

.app-table__search :deep(.v-field--focused),
.app-table__filter :deep(.v-field--focused) {
    box-shadow:
        inset 0 0 0 1px rgba(var(--v-theme-primary), 0.45),
        0 0 0 3px rgba(var(--v-theme-primary), 0.1);
}

.app-table__row-num {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 2rem;
    height: 1.75rem;
    padding-inline: 0.5rem;
    border-radius: 8px;
    font-size: 0.75rem;
    font-weight: 600;
    color: rgba(var(--v-theme-on-surface), 0.72);
    background: rgba(var(--v-theme-on-surface), 0.05);
}

.app-table__empty-cell {
    color: rgba(var(--v-theme-on-surface), 0.62);
}

.app-table__actions {
    display: inline-flex;
    align-items: center;
    justify-content: flex-end;
    flex-wrap: nowrap;
    gap: 0.375rem;
    width: max-content;
    max-width: none;
    margin-left: auto;
}

/* Phones and tablets: the table becomes a list of cards. */
.app-table--cards .app-table__data :deep(.v-table) {
    min-width: 0;
}

.app-table--cards .app-table__data :deep(.v-table__wrapper) {
    overflow-x: visible;
}

.app-table--cards .app-table__data :deep(.v-table__wrapper > table),
.app-table--cards .app-table__data :deep(.v-data-table__tbody),
.app-table--cards .app-table__data :deep(.v-data-table__tbody tr) {
    display: block;
    width: 100%;
}

.app-table--cards .app-table__data :deep(.v-data-table__tbody tr:hover) {
    box-shadow: none;
}

.app-table--cards .app-table__data :deep(.v-data-table__tbody td.app-table__cards-cell),
.app-table--cards .app-table__data :deep(.v-data-table__tbody tr:hover td.app-table__cards-cell),
.app-table--cards .app-table__data :deep(.v-data-table__tbody tr:nth-child(even) td.app-table__cards-cell) {
    display: block;
    width: 100% !important;
    min-width: 0 !important;
    max-width: none !important;
    height: auto;
    padding: 0.75rem !important;
    border: 0 !important;
    background: transparent !important;
    overflow: visible;
    white-space: normal;
}

/* Wide screens: the wrapper of the filters does not exist as a box, they flow in the toolbar as before. */
.app-table__filters {
    display: contents;
}

.app-table--cards .app-table__filters {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    flex: 1 1 100%;
    min-width: 100%;
}

.app-table__filters-toggle {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    flex: 1 1 100%;
    min-height: 2.75rem;
    padding-inline: 0.875rem;
    border: 1px solid rgba(var(--v-border-color), 0.18);
    border-radius: 0.75rem;
    background: rgba(var(--v-theme-surface), 0.7);
    color: rgba(var(--v-theme-on-surface), 0.82);
    font-family: inherit;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
}

.app-table__filters-count {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 1.375rem;
    height: 1.375rem;
    padding-inline: 0.375rem;
    border-radius: 999px;
    background: rgb(var(--v-theme-primary));
    color: rgb(var(--v-theme-on-primary));
    font-size: 0.75rem;
}

.app-table__filters-chevron {
    margin-left: auto;
}

/* One column on a phone, two on a tablet. */
.app-cards {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 19rem), 1fr));
    gap: 0.75rem;
    align-items: start;
}

.app-card {
    padding: 0.875rem;
    border: 1px solid rgba(var(--v-border-color), 0.14);
    border-radius: 1rem;
    background: rgb(var(--v-theme-surface));
}

.app-card.app-table__row--muted {
    opacity: 0.62;
}

.app-card__head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 0.5rem;
}

.app-card__heading {
    min-width: 0;
    flex: 1;
}

.app-card__title {
    font-size: 0.9375rem;
    font-weight: 600;
    line-height: 1.3;
    color: rgba(var(--v-theme-on-surface), 0.94);
    overflow-wrap: anywhere;
}

.app-card__subtitle {
    margin: 0.125rem 0 0;
    font-size: 0.8125rem;
    color: rgba(var(--v-theme-on-surface), 0.62);
    overflow-wrap: anywhere;
}

.app-card__chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.375rem;
    margin-top: 0.625rem;
}

.app-card__meta {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.625rem 0.75rem;
    margin: 0.75rem 0 0;
}

.app-card__meta-wide {
    grid-column: 1 / -1;
}

.app-card__meta dt {
    font-size: 0.6875rem;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: rgba(var(--v-theme-on-surface), 0.55);
}

.app-card__meta dd {
    margin: 0.125rem 0 0;
    font-size: 0.8125rem;
    color: rgba(var(--v-theme-on-surface), 0.88);
    overflow-wrap: anywhere;
}

.app-card__actions {
    display: flex;
    gap: 0.5rem;
    margin-top: 0.875rem;
    padding-top: 0.75rem;
    border-top: 1px solid rgba(var(--v-border-color), 0.1);
}

.app-card__primary {
    flex: 1;
    width: auto;
    height: 2.5rem;
    gap: 0.375rem;
    padding-inline: 0.75rem;
    font-family: inherit;
    font-size: 0.875rem;
    font-weight: 600;
}

.app-card__icon {
    width: 2.5rem;
    height: 2.5rem;
}

.app-table__sheet-card {
    padding-bottom: env(safe-area-inset-bottom, 0);
}

.app-table__sheet-title {
    font-size: 0.9375rem;
    font-weight: 700;
    padding-block: 1rem 0.25rem;
}

.app-table__sheet-item {
    min-height: 3.25rem;
}

.app-table__action {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 2.125rem;
    height: 2.125rem;
    border: 1px solid rgba(var(--v-border-color), 0.14);
    border-radius: 0.75rem;
    background: rgba(var(--v-theme-surface), 0.55);
    color: rgba(var(--v-theme-on-surface), 0.72);
    cursor: pointer;
    transition:
        transform 0.15s ease,
        background-color 0.15s ease,
        color 0.15s ease,
        border-color 0.15s ease,
        box-shadow 0.15s ease;
}

.app-table__action:hover {
    transform: translateY(-1px);
    background: rgba(var(--v-theme-on-surface), 0.04);
    color: rgba(var(--v-theme-on-surface), 0.9);
    box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08);
}

.app-table__action--primary {
    color: var(--ink-primary);
    border-color: rgba(var(--v-theme-primary), 0.18);
    background: rgba(var(--v-theme-primary), 0.08);
}

.app-table__action--primary:hover {
    background: rgba(var(--v-theme-primary), 0.14);
    color: var(--ink-primary);
    border-color: rgba(var(--v-theme-primary), 0.28);
}

.app-table__action--error {
    color: var(--ink-error);
    border-color: rgba(var(--v-theme-error), 0.18);
    background: rgba(var(--v-theme-error), 0.08);
}

.app-table__action--error:hover {
    background: rgba(var(--v-theme-error), 0.14);
    color: var(--ink-error);
    border-color: rgba(var(--v-theme-error), 0.28);
}

.app-table__action--warning {
    color: var(--ink-warning);
    border-color: rgba(var(--v-theme-warning), 0.18);
    background: rgba(var(--v-theme-warning), 0.08);
}

.app-table__action--warning:hover {
    background: rgba(var(--v-theme-warning), 0.14);
    color: var(--ink-warning);
    border-color: rgba(var(--v-theme-warning), 0.28);
}

.app-table__action--success {
    color: var(--ink-success);
    border-color: rgba(var(--v-theme-success), 0.18);
    background: rgba(var(--v-theme-success), 0.08);
}

.app-table__action--success:hover {
    background: rgba(var(--v-theme-success), 0.14);
    color: var(--ink-success);
    border-color: rgba(var(--v-theme-success), 0.28);
}

.app-table__data :deep(.app-table__row--muted td) {
    opacity: 0.55;
}

.app-table__state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 3rem 1.5rem;
}

.app-table__state--loading {
    min-height: 220px;
}

.app-table__state--empty {
    min-height: 260px;
}

.app-table__state-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 3.5rem;
    height: 3.5rem;
    margin-bottom: 0.875rem;
    border-radius: 1rem;
    background: rgba(var(--v-theme-primary), 0.1);
    color: var(--ink-primary);
}

.app-table__state-icon--muted {
    background: rgba(var(--v-theme-on-surface), 0.06);
    color: rgba(var(--v-theme-on-surface), 0.45);
}

.app-table__data :deep(.v-data-table__thead) {
    background:
        linear-gradient(
            180deg,
            rgba(var(--v-theme-on-surface), 0.03) 0%,
            rgba(var(--v-theme-on-surface), 0.015) 100%
        );
}

.app-table__data :deep(.v-data-table__thead th) {
    background: transparent !important;
    color: rgba(var(--v-theme-on-surface), 0.70) !important;
    font-size: 0.6875rem !important;
    font-weight: 700 !important;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    border-bottom: 1px solid rgba(var(--v-border-color), 0.12) !important;
    height: 3rem !important;
    padding-top: 0.75rem !important;
    padding-bottom: 0.75rem !important;
}

.app-table__data :deep(.v-data-table__tbody td) {
    border-bottom: 1px solid rgba(var(--v-border-color), 0.08) !important;
    padding-top: 0.875rem !important;
    padding-bottom: 0.875rem !important;
    font-size: 0.875rem;
    line-height: 1.45;
    color: rgba(var(--v-theme-on-surface), 0.88);
    transition: background-color 0.18s ease, color 0.18s ease;
}

.app-table__data :deep(.v-data-table__tbody tr:nth-child(even) td) {
    background: rgba(var(--v-theme-on-surface), 0.018);
}

.app-table__data :deep(.v-data-table__tbody tr:hover td) {
    background: rgba(var(--v-theme-primary), 0.05) !important;
}

.app-table__data :deep(.v-data-table__tbody tr) {
    position: relative;
}

.app-table__data :deep(.v-data-table__tbody tr:hover) {
    box-shadow: inset 3px 0 0 rgb(var(--v-theme-primary));
}

.app-table__data :deep(.v-data-table-footer) {
    border-top: 1px solid rgba(var(--v-border-color), 0.12);
    padding-inline: 1.25rem;
    padding-block: 0.75rem;
    font-size: 0.8125rem;
    background: rgba(var(--v-theme-on-surface), 0.02);
}

.app-table__data :deep(.v-data-table-footer .v-field) {
    border-radius: 0.75rem;
}

.app-table__data :deep(.v-pagination .v-btn) {
    color: rgba(var(--v-theme-on-surface), 0.72) !important;
    border-radius: 0.75rem;
}

.app-table__data :deep(.v-pagination__item--is-active .v-btn) {
    background: rgba(var(--v-theme-primary), 0.14) !important;
    color: var(--ink-primary) !important;
    box-shadow: inset 0 0 0 1px rgba(var(--v-theme-primary), 0.18);
}

@media (max-width: 960px) {
    .app-table__toolbar {
        padding-inline: 1rem;
    }

    .app-table__search,
    .app-table__filter {
        min-width: 100%;
        max-width: 100%;
        flex: 1 1 100%;
    }
}

@media (max-width: 600px) {
    .app-table__data :deep(.v-data-table-footer) {
        flex-direction: column;
        align-items: stretch;
        gap: 12px;
        padding-block: 12px !important;
    }

    .app-table__data :deep(.v-data-table-footer__info) {
        justify-content: center;
        margin-inline: 0 !important;
    }

    .app-table__data :deep(.v-data-table-footer__pagination) {
        justify-content: center;
    }
}

/* The first data column is the record's name (client, user, branch...): a touch stronger than the rest. */
.app-table__data :deep(.v-data-table__tbody td:nth-child(2)) {
    font-weight: 600;
    color: rgba(var(--v-theme-on-surface), 0.94);
}

/* Money and counts keep their digits aligned. */
.app-table__data :deep(.v-data-table__tbody td) {
    font-variant-numeric: tabular-nums;
}
</style>
