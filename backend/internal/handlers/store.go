package handlers

import (
	"net/http"

	"purchase-tracker/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type StoreHandler struct {
	db *gorm.DB
}

func NewStoreHandler(db *gorm.DB) *StoreHandler {
	return &StoreHandler{db: db}
}

func (h *StoreHandler) GetAll(c *gin.Context) {
	var stores []models.Store
	if err := h.db.Order("name ASC").Find(&stores).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "success", "message": "Stores retrieved successfully", "data": stores})
}

type createStoreRequest struct {
	Name string `json:"name" binding:"required"`
}

func (h *StoreHandler) Create(c *gin.Context) {
	var req createStoreRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "Store name is required"})
		return
	}

	store := models.Store{Name: req.Name}
	if err := h.db.Create(&store).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"status": "success", "message": "Store created successfully", "data": store})
}

type updateStoreRequest struct {
	Name     *string `json:"name"`
	IsActive *bool   `json:"is_active"`
}

func (h *StoreHandler) Update(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "Invalid ID"})
		return
	}

	var req updateStoreRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "Invalid payload"})
		return
	}

	fields := map[string]interface{}{}
	if req.Name != nil {
		fields["name"] = *req.Name
	}
	if req.IsActive != nil {
		fields["is_active"] = *req.IsActive
	}

	if err := h.db.Model(&models.Store{}).Where("id = ?", id).Updates(fields).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": err.Error()})
		return
	}

	var store models.Store
	h.db.Where("id = ?", id).First(&store)
	c.JSON(http.StatusOK, gin.H{"status": "success", "message": "Store updated successfully", "data": store})
}

func (h *StoreHandler) Delete(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "Invalid ID"})
		return
	}

	err = h.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("store_id = ?", id).Delete(&models.PurchaseEntry{}).Error; err != nil {
			return err
		}
		if err := tx.Where("store_id = ?", id).Delete(&models.Supplier{}).Error; err != nil {
			return err
		}
		if err := tx.Where("store_id = ?", id).Delete(&models.LabourHourEntry{}).Error; err != nil {
			return err
		}
		if err := tx.Where("store_id = ?", id).Delete(&models.Employee{}).Error; err != nil {
			return err
		}
		if err := tx.Where("store_id = ?", id).Delete(&models.GrossSalesEntry{}).Error; err != nil {
			return err
		}
		if err := tx.Where("store_id = ?", id).Delete(&models.WeeklyLabourRate{}).Error; err != nil {
			return err
		}
		if err := tx.Where("store_id = ?", id).Delete(&models.WeeklyNetSalesRate{}).Error; err != nil {
			return err
		}
		return tx.Where("id = ?", id).Delete(&models.Store{}).Error
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "success", "message": "Store deleted successfully"})
}

func RegisterStoreRoutes(rg *gin.RouterGroup, h *StoreHandler) {
	rg.GET("/store", h.GetAll)
	rg.POST("/store", h.Create)
	rg.PUT("/store/:id", h.Update)
	rg.DELETE("/store/:id", h.Delete)
}
