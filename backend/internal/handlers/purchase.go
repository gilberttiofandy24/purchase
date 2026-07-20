package handlers

import (
	"errors"
	"net/http"
	"time"

	"purchase-tracker/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

const dateLayout = "2006-01-02"

const (
	weekdayWageRate = 33.05
	weekendWageRate = 39.66
	superMultiplier = 1.12
	gstDivisor      = 1.10
)

func labourCostForDay(date time.Time, totalHours float64) float64 {
	rate := weekdayWageRate
	if date.Weekday() == time.Saturday || date.Weekday() == time.Sunday {
		rate = weekendWageRate
	}
	return totalHours * rate * superMultiplier
}

type PurchaseHandler struct {
	db *gorm.DB
}

func NewPurchaseHandler(db *gorm.DB) *PurchaseHandler {
	return &PurchaseHandler{db: db}
}

type supplierWeekRow struct {
	SupplierID      uuid.UUID          `json:"supplier_id"`
	SupplierName    string             `json:"supplier_name"`
	DailyAmounts    map[string]float64 `json:"daily_amounts"`
	Total           float64            `json:"total"`
	PercentageOfAll float64            `json:"percentage_of_all"`
}

type labourDayInfo struct {
	StaffCount int     `json:"staff_count"`
	TotalHours float64 `json:"total_hours"`
	LabourCost float64 `json:"labour_cost"`
	IsWeekend  bool    `json:"is_weekend"`
}

type weeklyReportData struct {
	StoreID            uuid.UUID                `json:"store_id"`
	WeekStartDate      string                   `json:"week_start_date"`
	WeekEndDate        string                   `json:"week_end_date"`
	Suppliers          []supplierWeekRow        `json:"suppliers"`
	GrandTotalPurchase float64                  `json:"grand_total_purchase"`
	GrossSalesDaily    map[string]float64       `json:"gross_sales_daily"`
	GrossSalesTotal    float64                  `json:"gross_sales_total"`
	NetSales           float64                  `json:"net_sales"`
	PurchaseRatioPct   float64                  `json:"purchase_ratio_pct"`
	LabourDaily        map[string]labourDayInfo `json:"labour_daily"`
	LabourTotal        float64                  `json:"labour_total"`
	NetSalesFromGross  float64                  `json:"net_sales_from_gross"`
	LabourCostPct      float64                  `json:"labour_cost_pct"`
}

func (h *PurchaseHandler) GetWeeklyReport(c *gin.Context) {
	storeID, err := uuid.Parse(c.Query("store_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "store_id tidak valid"})
		return
	}

	weekStart, err := time.Parse(dateLayout, c.Query("week_start_date"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "week_start_date harus format YYYY-MM-DD"})
		return
	}
	if weekStart.Weekday() != time.Monday {
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "week_start_date harus hari Senin"})
		return
	}
	weekEnd := weekStart.AddDate(0, 0, 6)

	weekDates := make([]string, 7)
	for i := range weekDates {
		weekDates[i] = weekStart.AddDate(0, 0, i).Format(dateLayout)
	}

	var suppliers []models.Supplier
	if err := h.db.Where("store_id = ? AND is_active = true", storeID).
		Order("sort_order ASC, name ASC").Find(&suppliers).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": err.Error()})
		return
	}

	var entries []models.PurchaseEntry
	if err := h.db.Where("store_id = ? AND purchase_date BETWEEN ? AND ?", storeID, weekStart, weekEnd).
		Find(&entries).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": err.Error()})
		return
	}
	entriesBySupplier := make(map[uuid.UUID]map[string]float64)
	for _, e := range entries {
		if entriesBySupplier[e.SupplierID] == nil {
			entriesBySupplier[e.SupplierID] = make(map[string]float64)
		}
		entriesBySupplier[e.SupplierID][e.PurchaseDate.Format(dateLayout)] = e.Amount
	}

	var grossEntries []models.GrossSalesEntry
	if err := h.db.Where("store_id = ? AND sales_date BETWEEN ? AND ?", storeID, weekStart, weekEnd).
		Find(&grossEntries).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": err.Error()})
		return
	}
	grossByDate := make(map[string]float64)
	for _, g := range grossEntries {
		grossByDate[g.SalesDate.Format(dateLayout)] = g.Amount
	}

	var labourEntries []models.LabourEntry
	if err := h.db.Where("store_id = ? AND entry_date BETWEEN ? AND ?", storeID, weekStart, weekEnd).
		Find(&labourEntries).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": err.Error()})
		return
	}
	labourByDate := make(map[string]models.LabourEntry)
	for _, l := range labourEntries {
		labourByDate[l.EntryDate.Format(dateLayout)] = l
	}

	var netSalesEntry models.WeeklyNetSales
	var netSales float64
	err = h.db.Where("store_id = ? AND week_start_date = ?", storeID, weekStart).First(&netSalesEntry).Error
	if err == nil {
		netSales = netSalesEntry.Amount
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": err.Error()})
		return
	}

	rows := make([]supplierWeekRow, 0, len(suppliers))
	var grandTotal float64
	for _, supplier := range suppliers {
		daily := make(map[string]float64, 7)
		var total float64
		for _, d := range weekDates {
			amount := entriesBySupplier[supplier.ID][d]
			daily[d] = amount
			total += amount
		}
		grandTotal += total
		rows = append(rows, supplierWeekRow{
			SupplierID:   supplier.ID,
			SupplierName: supplier.Name,
			DailyAmounts: daily,
			Total:        total,
		})
	}
	for i := range rows {
		if grandTotal > 0 {
			rows[i].PercentageOfAll = rows[i].Total / grandTotal * 100
		}
	}

	grossFilled := make(map[string]float64, 7)
	var grossTotal float64
	for _, d := range weekDates {
		grossFilled[d] = grossByDate[d]
		grossTotal += grossByDate[d]
	}

	var purchaseRatioPct float64
	if netSales > 0 {
		purchaseRatioPct = grandTotal / netSales * 100
	}

	labourFilled := make(map[string]labourDayInfo, 7)
	var labourTotal float64
	for i, d := range weekDates {
		date := weekStart.AddDate(0, 0, i)
		entry := labourByDate[d]
		cost := labourCostForDay(date, entry.TotalHours)
		labourFilled[d] = labourDayInfo{
			StaffCount: entry.StaffCount,
			TotalHours: entry.TotalHours,
			LabourCost: cost,
			IsWeekend:  date.Weekday() == time.Saturday || date.Weekday() == time.Sunday,
		}
		labourTotal += cost
	}

	netSalesFromGross := grossTotal / gstDivisor
	var labourCostPct float64
	if netSalesFromGross > 0 {
		labourCostPct = labourTotal / netSalesFromGross * 100
	}

	data := weeklyReportData{
		StoreID:            storeID,
		WeekStartDate:      weekStart.Format(dateLayout),
		WeekEndDate:        weekEnd.Format(dateLayout),
		Suppliers:          rows,
		GrandTotalPurchase: grandTotal,
		GrossSalesDaily:    grossFilled,
		GrossSalesTotal:    grossTotal,
		NetSales:           netSales,
		PurchaseRatioPct:   purchaseRatioPct,
		LabourDaily:        labourFilled,
		LabourTotal:        labourTotal,
		NetSalesFromGross:  netSalesFromGross,
		LabourCostPct:      labourCostPct,
	}

	c.JSON(http.StatusOK, gin.H{"status": "success", "message": "Weekly report retrieved successfully", "data": data})
}

type upsertPurchaseEntryRequest struct {
	StoreID      uuid.UUID `json:"store_id" binding:"required"`
	SupplierID   uuid.UUID `json:"supplier_id" binding:"required"`
	PurchaseDate string    `json:"purchase_date" binding:"required"`
	Amount       float64   `json:"amount" binding:"min=0"`
}

func (h *PurchaseHandler) UpsertPurchaseEntry(c *gin.Context) {
	var req upsertPurchaseEntryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "Payload tidak valid"})
		return
	}
	purchaseDate, err := time.Parse(dateLayout, req.PurchaseDate)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "purchase_date harus format YYYY-MM-DD"})
		return
	}

	entry := models.PurchaseEntry{
		StoreID:      req.StoreID,
		SupplierID:   req.SupplierID,
		PurchaseDate: purchaseDate,
		Amount:       req.Amount,
	}
	err = h.db.Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "supplier_id"}, {Name: "purchase_date"}},
		DoUpdates: clause.AssignmentColumns([]string{"amount", "updated_at"}),
	}).Create(&entry).Error
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "success", "message": "Purchase entry saved successfully"})
}

type upsertGrossSalesRequest struct {
	StoreID   uuid.UUID `json:"store_id" binding:"required"`
	SalesDate string    `json:"sales_date" binding:"required"`
	Amount    float64   `json:"amount" binding:"min=0"`
}

func (h *PurchaseHandler) UpsertGrossSales(c *gin.Context) {
	var req upsertGrossSalesRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "Payload tidak valid"})
		return
	}
	salesDate, err := time.Parse(dateLayout, req.SalesDate)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "sales_date harus format YYYY-MM-DD"})
		return
	}

	entry := models.GrossSalesEntry{StoreID: req.StoreID, SalesDate: salesDate, Amount: req.Amount}
	err = h.db.Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "store_id"}, {Name: "sales_date"}},
		DoUpdates: clause.AssignmentColumns([]string{"amount", "updated_at"}),
	}).Create(&entry).Error
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "success", "message": "Gross sales entry saved successfully"})
}

type upsertNetSalesRequest struct {
	StoreID       uuid.UUID `json:"store_id" binding:"required"`
	WeekStartDate string    `json:"week_start_date" binding:"required"`
	Amount        float64   `json:"amount" binding:"min=0"`
}

func (h *PurchaseHandler) UpsertNetSales(c *gin.Context) {
	var req upsertNetSalesRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "Payload tidak valid"})
		return
	}
	weekStart, err := time.Parse(dateLayout, req.WeekStartDate)
	if err != nil || weekStart.Weekday() != time.Monday {
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "week_start_date harus format YYYY-MM-DD dan hari Senin"})
		return
	}

	entry := models.WeeklyNetSales{StoreID: req.StoreID, WeekStartDate: weekStart, Amount: req.Amount}
	err = h.db.Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "store_id"}, {Name: "week_start_date"}},
		DoUpdates: clause.AssignmentColumns([]string{"amount", "updated_at"}),
	}).Create(&entry).Error
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "success", "message": "Net sales saved successfully"})
}

type upsertLabourEntryRequest struct {
	StoreID    uuid.UUID `json:"store_id" binding:"required"`
	EntryDate  string    `json:"entry_date" binding:"required"`
	StaffCount int       `json:"staff_count" binding:"min=0"`
	TotalHours float64   `json:"total_hours" binding:"min=0"`
}

func (h *PurchaseHandler) UpsertLabourEntry(c *gin.Context) {
	var req upsertLabourEntryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "Payload tidak valid"})
		return
	}
	entryDate, err := time.Parse(dateLayout, req.EntryDate)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "entry_date harus format YYYY-MM-DD"})
		return
	}

	entry := models.LabourEntry{
		StoreID:    req.StoreID,
		EntryDate:  entryDate,
		StaffCount: req.StaffCount,
		TotalHours: req.TotalHours,
	}
	err = h.db.Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "store_id"}, {Name: "entry_date"}},
		DoUpdates: clause.AssignmentColumns([]string{"staff_count", "total_hours", "updated_at"}),
	}).Create(&entry).Error
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "success", "message": "Labour entry saved successfully"})
}

func RegisterPurchaseRoutes(rg *gin.RouterGroup, h *PurchaseHandler) {
	rg.GET("/purchase/weekly-report", h.GetWeeklyReport)
	rg.PUT("/purchase/entry", h.UpsertPurchaseEntry)
	rg.PUT("/purchase/gross-sales", h.UpsertGrossSales)
	rg.PUT("/purchase/net-sales", h.UpsertNetSales)
	rg.PUT("/purchase/labour-entry", h.UpsertLabourEntry)
}
