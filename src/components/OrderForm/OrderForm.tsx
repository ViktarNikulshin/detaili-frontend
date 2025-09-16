import React, { useEffect, useState } from "react";
import { useForm, Controller, SubmitHandler } from "react-hook-form";
import * as Yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import { useParams } from "react-router-dom";
import { orderAPI } from "../../services/api";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import "./OrderForm.css";

// ✅ Тип формы
type OrderFormData = {
    clientName: string;
    clientPhone: string;
    carBrand: string;
    carModel: string;
    vin: string;
    workType: string;
    executionDate: string;
};

// ✅ Типы для марок и моделей
interface CarBrand {
    id: string;
    name: string;
}

interface CarModel {
    id: string;
    name: string;
    brand_id: string;
}

// ✅ Схема валидации
const schema = Yup.object({
    clientName: Yup.string().required("Введите имя клиента"),
    clientPhone: Yup.string().required("Введите телефон"),
    carBrand: Yup.string().required("Выберите марку автомобиля"),
    carModel: Yup.string().required("Выберите модель автомобиля"),
    vin: Yup.string().required("Введите VIN"),
    workType: Yup.string().required("Опишите тип работ"),
    executionDate: Yup.string().required("Укажите дату выполнения"),
});

const OrderForm: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [loading, setLoading] = useState(false);
    const [brands, setBrands] = useState<CarBrand[]>([]);
    const [models, setModels] = useState<CarModel[]>([]);
    const [modelsLoading, setModelsLoading] = useState(false);

    const {
        control,
        handleSubmit,
        register,
        reset,
        watch,
        setValue,
        formState: { errors },
    } = useForm<OrderFormData>({
        resolver: yupResolver(schema),
        defaultValues: {
            clientName: "",
            clientPhone: "",
            carBrand: "",
            carModel: "",
            vin: "",
            workType: "",
            executionDate: "",
        },
    });

    // Следим за изменением выбранной марки
    const selectedBrand = watch("carBrand");

    // ✅ Загружаем список марок при монтировании
    useEffect(() => {
        const loadBrands = async () => {
            try {
                // Здесь можно использовать ваше API или внешнее
                // Пример с внешним API (можно заменить на ваше)
                const response = await orderAPI.getCarBrands();
                const data = await response.data;
                setBrands(data);

                if (data.Results) {
                    const carBrands = data.Results
                        .filter((brand: any) => brand.Make_Name)
                        .map((brand: any) => ({
                            id: brand.id,
                            name: brand.name
                        }))
                        .sort((a: CarBrand, b: CarBrand) => a.name.localeCompare(b.name));

                    setBrands(carBrands);
                }
            } catch (error) {
                console.error("Ошибка загрузки марок:", error);
                // Fallback список марок
                setBrands([
                    { id: "1", name: "Audi" },
                    { id: "2", name: "BMW" },
                    { id: "3", name: "Mercedes-Benz" },
                    { id: "4", name: "Volkswagen" },
                    { id: "5", name: "Toyota" },
                    { id: "6", name: "Honda" },
                    { id: "7", name: "Ford" },
                    { id: "8", name: "Chevrolet" },
                    { id: "9", name: "Nissan" },
                    { id: "10", name: "Hyundai" },
                ]);
            }
        };

        loadBrands();
    }, []);

    // ✅ Загружаем модели при изменении выбранной марки
    useEffect(() => {
        const loadModels = async () => {
            if (!selectedBrand) {
                setModels([]);
                setValue("carModel", "");
                return;
            }

            setModelsLoading(true);
            try {
                const response = await orderAPI.getCarModel(selectedBrand);
                const data = await response.data;
                setModels(data);
                if (data.Results) {
                    const carModels = data.Results
                        .filter((model: any) => model.Model_Name)
                        .map((model: any) => ({
                            id: model.id,
                            name: model.name,
                            brand_id: selectedBrand
                        }))
                        .sort((a: CarModel, b: CarModel) => a.name.localeCompare(b.name));

                    setModels(carModels);
                }
            } catch (error) {
                console.error("Ошибка загрузки моделей:", error);
                // Fallback список моделей
                setModels([
                    { id: "1", name: "Model 1", brand_id: selectedBrand },
                    { id: "2", name: "Model 2", brand_id: selectedBrand },
                    { id: "3", name: "Model 3", brand_id: selectedBrand },
                ]);
            } finally {
                setModelsLoading(false);
            }
        };

        loadModels();
    }, [selectedBrand, setValue]);

    // ✅ Загружаем заказ по id
    useEffect(() => {
        const loadOrder = async () => {
            if (!id) return;
            setLoading(true);
            try {
                const response = await orderAPI.getById(id);
                const order = response.data;

                reset({
                    clientName: order.clientName || "",
                    clientPhone: order.clientPhone || "",
                    carBrand: order.carBrand || "",
                    carModel: order.carModel || "",
                    vin: order.vin || "",
                    workType: order.workType || "",
                    executionDate: order.executionDate
                        ? order.executionDate.slice(0, 16)
                        : "",
                });

                // Если в заказе уже есть марка, загружаем соответствующие модели
                if (order.carBrand) {
                    setValue("carBrand", order.carBrand);
                }
            } catch (e) {
                console.error("Ошибка загрузки заказа:", e);
            } finally {
                setLoading(false);
            }
        };
        loadOrder();
    }, [id, reset, setValue]);

    // ✅ Сабмит
    const onSubmit: SubmitHandler<OrderFormData> = async (data) => {
        try {
            const formDataToSend = new FormData();
            Object.entries(data).forEach(([key, value]) => {
                if (value) formDataToSend.append(key, value.toString());
            });

            if (id) {
                await orderAPI.update(id, formDataToSend);
                alert("Заказ обновлён!");
            } else {
                await orderAPI.create(formDataToSend);
                alert("Заказ создан!");
            }
        } catch (error) {
            console.error("Ошибка сохранения:", error);
        }
    };

    if (loading) return <p>Загрузка...</p>;

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="order-form">
            <input
                type="text"
                placeholder="Имя клиента"
                {...register("clientName")}
                className={errors.clientName ? "error" : ""}
            />
            {errors.clientName && (
                <span className="error-text">{errors.clientName.message}</span>
            )}

            <Controller
                name="clientPhone"
                control={control}
                render={({ field }) => (
                    <PhoneInput
                        {...field}
                        country={"by"}
                        onlyCountries={["by", "ru", "ua", "pl", "lt"]}
                        placeholder="Телефон"
                        inputStyle={{
                            width: "100%",
                            height: "52px",
                            borderRadius: "14px",
                            border: "1px solid rgba(90,200,250,0.4)",
                            fontSize: "16px",
                        }}
                    />
                )}
            />
            {errors.clientPhone && (
                <span className="error-text">{errors.clientPhone.message}</span>
            )}

            {/* Выбор марки автомобиля */}
            <div className="form-group">
                <select
                    {...register("carBrand")}
                    className={errors.carBrand ? "error" : ""}
                >
                    <option value="">Выберите марку автомобиля</option>
                    {brands.map((brand) => (
                        <option key={brand.id} value={brand.id}>
                            {brand.name}
                        </option>
                    ))}
                </select>
                {errors.carBrand && (
                    <span className="error-text">{errors.carBrand.message}</span>
                )}
            </div>

            {/* Выбор модели автомобиля */}
            <div className="form-group">
                <select
                    {...register("carModel")}
                    disabled={!selectedBrand || modelsLoading}
                    className={errors.carModel ? "error" : ""}
                >
                    <option value="">
                        {modelsLoading ? "Загрузка моделей..." : "Выберите модель автомобиля"}
                    </option>
                    {models.map((model) => (
                        <option key={model.id} value={model.id}>
                            {model.name}
                        </option>
                    ))}
                </select>
                {errors.carModel && (
                    <span className="error-text">{errors.carModel.message}</span>
                )}
            </div>

            <input
                type="text"
                placeholder="VIN"
                {...register("vin")}
                className={errors.vin ? "error" : ""}
            />
            {errors.vin && (
                <span className="error-text">{errors.vin.message}</span>
            )}

            <textarea
                placeholder="Тип работ"
                {...register("workType")}
                className={errors.workType ? "error" : ""}
            />
            {errors.workType && (
                <span className="error-text">{errors.workType.message}</span>
            )}

            <input
                type="datetime-local"
                {...register("executionDate")}
                className={errors.executionDate ? "error" : ""}
            />
            {errors.executionDate && (
                <span className="error-text">{errors.executionDate.message}</span>
            )}

            <button type="submit">Сохранить заказ</button>
        </form>
    );
};

export default OrderForm;