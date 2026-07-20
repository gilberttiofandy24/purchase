package handlers

import (
	"net/http"

	"purchase-tracker/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type SupplierHandler struct {
	db *gorm.DB
}

func NewSupplierHandler(db *gorm.DB) *SupplierHandler {
	return &SupplierHandler{db: db}
}

func (h *SupplierHandler) GetByStoreID(c *gin.Context) {
	storeID, err := uuid.Parse(c.Param("store_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "store_id tidak valid"})
		return
	}

	var suppliers []models.Supplier
	if err := h.db.Where("store_id = ?", storeID).Order("sort_order ASC, name ASC").Find(&suppliers).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "success", "message": "Suppliers retrieved successfully", "data": suppliers})
}

type createSupplierRequest struct {
	Name string `json:"name" binding:"required"`
}

func (h *SupplierHandler) Create(c *gin.Context) {
	storeID, err := uuid.Parse(c.Param("store_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "store_id tidak valid"})
		return
	}

	var req createSupplierRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "Nama supplier wajib diisi"})
		return
	}

	supplier := models.Supplier{StoreID: storeID, Name: req.Name}
	if err := h.db.Create(&supplier).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"status": "success", "message": "Supplier created successfully", "data": supplier})
}

type updateSupplierRequest struct {
	Name      *string `json:"name"`
	SortOrder *int    `json:"sort_order"`
	IsActive  *bool   `json:"is_active"`
}

func (h *SupplierHandler) Update(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "ID tidak valid"})
		return
	}

	var req updateSupplierRequest
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

	if err := h.db.Model(&models.Supplier{}).Where("id = ?", id).Updates(fields).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": err.Error()})
		return
	}

	var supplier models.Supplier
	h.db.Where("id = ?", id).First(&supplier)
	c.JSON(http.StatusOK, gin.H{"status": "success", "message": "Supplier updated successfully", "data": supplier})
}

func (h *SupplierHandler) Delete(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "ID tidak valid"})
		return
	}

	err = h.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("supplier_id = ?", id).Delete(&models.PurchaseEntry{}).Error; err != nil {
			return err
		}
		return tx.Where("id = ?", id).Delete(&models.Supplier{}).Error
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "success", "message": "Supplier deleted successfully"})
}

func RegisterSupplierRoutes(rg *gin.RouterGroup, h *SupplierHandler) {
	rg.GET("/store/:store_id/supplier", h.GetByStoreID)
	rg.POST("/store/:store_id/supplier", h.Create)
	rg.PUT("/supplier/:id", h.Update)
	rg.DELETE("/supplier/:id", h.Delete)
}
