package handlers

import (
	"net/http"

	"purchase-tracker/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type EmployeeHandler struct {
	db *gorm.DB
}

func NewEmployeeHandler(db *gorm.DB) *EmployeeHandler {
	return &EmployeeHandler{db: db}
}

func (h *EmployeeHandler) GetByStoreID(c *gin.Context) {
	storeID, err := uuid.Parse(c.Param("store_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "store_id tidak valid"})
		return
	}

	var employees []models.Employee
	if err := h.db.Where("store_id = ?", storeID).Order("sort_order ASC, name ASC").Find(&employees).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "success", "message": "Employees retrieved successfully", "data": employees})
}

type createEmployeeRequest struct {
	Name string `json:"name" binding:"required"`
}

func (h *EmployeeHandler) Create(c *gin.Context) {
	storeID, err := uuid.Parse(c.Param("store_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "store_id tidak valid"})
		return
	}

	var req createEmployeeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "Nama karyawan wajib diisi"})
		return
	}

	employee := models.Employee{StoreID: storeID, Name: req.Name}
	if err := h.db.Create(&employee).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"status": "success", "message": "Employee created successfully", "data": employee})
}

type updateEmployeeRequest struct {
	Name      *string `json:"name"`
	SortOrder *int    `json:"sort_order"`
	IsActive  *bool   `json:"is_active"`
}

func (h *EmployeeHandler) Update(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "ID tidak valid"})
		return
	}

	var req updateEmployeeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "Payload tidak valid"})
		return
	}

	fields := map[string]interface{}{}
	if req.Name != nil {
		fields["name"] = *req.Name
	}
	if req.SortOrder != nil {
		fields["sort_order"] = *req.SortOrder
	}
	if req.IsActive != nil {
		fields["is_active"] = *req.IsActive
	}

	if err := h.db.Model(&models.Employee{}).Where("id = ?", id).Updates(fields).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": err.Error()})
		return
	}

	var employee models.Employee
	h.db.Where("id = ?", id).First(&employee)
	c.JSON(http.StatusOK, gin.H{"status": "success", "message": "Employee updated successfully", "data": employee})
}

func (h *EmployeeHandler) Delete(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "ID tidak valid"})
		return
	}

	err = h.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("employee_id = ?", id).Delete(&models.LabourHourEntry{}).Error; err != nil {
			return err
		}
		return tx.Where("id = ?", id).Delete(&models.Employee{}).Error
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "success", "message": "Employee deleted successfully"})
}

func RegisterEmployeeRoutes(rg *gin.RouterGroup, h *EmployeeHandler) {
	rg.GET("/store/:store_id/employee", h.GetByStoreID)
	rg.POST("/store/:store_id/employee", h.Create)
	rg.PUT("/employee/:id", h.Update)
	rg.DELETE("/employee/:id", h.Delete)
}
