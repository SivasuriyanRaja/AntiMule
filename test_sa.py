from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy import Column, Integer, String

class Base(DeclarativeBase):
    pass

try:
    class User(Base):
        __tablename__ = 'users'
        id: Mapped[int] = mapped_column(primary_key=True)
        email = Column(String(255))
    print("SUCCESS")
except Exception as e:
    import traceback
    traceback.print_exc()
