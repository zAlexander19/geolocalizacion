import Button from './button'

export default function ActionsMenu({ onEdit, onDelete }) {
  return (
    <div className="flex gap-1">
      <Button size="sm" variant="outline" onClick={onEdit} aria-label="Editar">
        <span className="material-icons" style={{ fontSize: 16 }}>edit</span>
      </Button>
      <Button size="sm" variant="ghost" onClick={onDelete} aria-label="Borrar">
        <span className="material-icons" style={{ fontSize: 16 }}>delete</span>
      </Button>
    </div>
  )
}
