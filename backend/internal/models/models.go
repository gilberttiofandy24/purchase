package models

import (
	"time"

	"github.com/google/uuid"
)

type User struct {
	ID           uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	Username     string    `gorm:"uniqueIndex;not null" json:"username"`
	PasswordHash string    `gorm:"not null" json:"-"`
	CreatedAt    time.Time `json:"created_at"`
}

type Store struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	Name      string    `gorm:"not null" json:"name"`
	IsActive  bool      `gorm:"not null;default:true" json:"is_active"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type Supplier struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	StoreID   uuid.UUID `gorm:"type:uuid;not null;index" json:"store_id"`
	Name      string    `gorm:"not null" json:"name"`
	SortOrder int       `gorm:"not null;default:0" json:"sort_order"`
	IsActive  bool      `gorm:"not null;default:true" json:"is_active"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type PurchaseEntry struct {
	ID           uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	StoreID      uuid.UUID `gorm:"type:uuid;not null;index:idx_purchase_store_date" json:"store_id"`
	SupplierID   uuid.UUID `gorm:"type:uuid;not null;uniqueIndex:idx_purchase_supplier_date" json:"supplier_id"`
	PurchaseDate time.Time `gorm:"type:date;not null;uniqueIndex:idx_purchase_supplier_date;index:idx_purchase_store_date" json:"purchase_date"`
	Amount       float64   `gorm:"type:numeric(15,2);not null;default:0" json:"amount"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

type GrossSalesEntry struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	StoreID   uuid.UUID `gorm:"type:uuid;not null;uniqueIndex:idx_gross_sales_store_date" json:"store_id"`
	SalesDate time.Time `gorm:"type:date;not null;uniqueIndex:idx_gross_sales_store_date" json:"sales_date"`
	Amount    float64   `gorm:"type:numeric(15,2);not null;default:0" json:"amount"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type Employee struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	StoreID   uuid.UUID `gorm:"type:uuid;not null;index" json:"store_id"`
	Name      string    `gorm:"not null" json:"name"`
	SortOrder int       `gorm:"not null;default:0" json:"sort_order"`
	IsActive  bool      `gorm:"not null;default:true" json:"is_active"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type LabourHourEntry struct {
	ID         uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	StoreID    uuid.UUID `gorm:"type:uuid;not null;index:idx_labour_hour_store_date" json:"store_id"`
	EmployeeID uuid.UUID `gorm:"type:uuid;not null;uniqueIndex:idx_labour_hour_employee_date" json:"employee_id"`
	EntryDate  time.Time `gorm:"type:date;not null;uniqueIndex:idx_labour_hour_employee_date;index:idx_labour_hour_store_date" json:"entry_date"`
	TotalHours float64   `gorm:"type:numeric(10,2);not null;default:0" json:"total_hours"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

type WeeklyNetSales struct {
	ID            uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	StoreID       uuid.UUID `gorm:"type:uuid;not null;uniqueIndex:idx_net_sales_store_week" json:"store_id"`
	WeekStartDate time.Time `gorm:"type:date;not null;uniqueIndex:idx_net_sales_store_week" json:"week_start_date"`
	Amount        float64   `gorm:"type:numeric(15,2);not null;default:0" json:"amount"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}
