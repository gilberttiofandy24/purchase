package auth

import (
	"net/http"

	"purchase-tracker/internal/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type Handler struct {
	db *gorm.DB
}

func NewHandler(db *gorm.DB) *Handler {
	return &Handler{db: db}
}

type loginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

func (h *Handler) Login(c *gin.Context) {
	var req loginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "Username dan password wajib diisi"})
		return
	}

	var user models.User
	if err := h.db.Where("username = ?", req.Username).First(&user).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"status": "error", "message": "Username atau password salah"})
		return
	}

	if !CheckPassword(user.PasswordHash, req.Password) {
		c.JSON(http.StatusUnauthorized, gin.H{"status": "error", "message": "Username atau password salah"})
		return
	}

	token, err := GenerateToken(user.ID, user.Username)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "Gagal membuat sesi"})
		return
	}

	SetAuthCookie(c, token)
	c.JSON(http.StatusOK, gin.H{"status": "success", "message": "Login berhasil", "data": gin.H{"username": user.Username}})
}

func (h *Handler) Logout(c *gin.Context) {
	ClearAuthCookie(c)
	c.JSON(http.StatusOK, gin.H{"status": "success", "message": "Logout berhasil"})
}

func (h *Handler) Me(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"status": "success", "data": gin.H{"username": c.GetString("username")}})
}

func RegisterRoutes(rg *gin.RouterGroup, h *Handler) {
	rg.POST("/login", h.Login)
	rg.POST("/logout", h.Logout)

	protected := rg.Group("")
	protected.Use(Middleware())
	protected.GET("/me", h.Me)
}
