import React, { useEffect, useState } from "react";
import { useForm, Controller, SubmitHandler, FieldValues } from "react-hook-form";
import * as Yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import { useParams } from "react-router-dom";
import { orderAPI } from "../../services/orderApi";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import "./OrderForm.css";
import { userAPI } from "../../services/user";
import { User } from "../../types/user";
import { Order } from "../../types/order";

// ✅ Типы для марок, моделей, работ и мастеров
interface CarBrand {
    id: string;
    name: string;
}

interface CarModel {
    id: string;
    name: string;
    brand_id: string;
}

interface WorkType {
    id: number;
    name: string;
}

interface Master {
    id: number;
    firstName: string;
    lastName: string;
}

type OrderFormData = {
    clientName: string;
    clientPhone: string;
    carBrand: CarBrand | null;
    carModel: CarModel | null;
    vin: string;
    workTypeIds: number[];
    masterIds: number[];
    executionDate: string;
    orderCost: number;
    executionTimeByMaster?: string | null;
};

interface OrderFormValues {
    clientName: string;
    clientPhone: string;
    carBrand: string;
    carModel: string;
    vin: string;
    workTypeIds: number[];
    masterIds: number[];
    executionDate: string;
    orderCost: number;
    executionTimeByMaster?: string | null;
}

const schema: Yup.ObjectSchema<OrderFormValues> = Yup.object().shape({
    clientName: Yup.string().required("Введите имя клиента"),
    clientPhone: Yup.string().required("Введите телефон"),
    carBrand: Yup.string().required("Выберите марку автомобиля"),
    carModel: Yup.string().required("Выберите модель автомобиля"),
    vin: Yup.string().required("Введите VIN"),
    workTypeIds: Yup.array()
        .of(Yup.number().required())
        .min(1, "Выберите хотя бы один тип работ")
        .required("Выберите тип работ"),
    masterIds: Yup.array().of(Yup.number().required()).min(1, "Выберите хотя бы одного мастера").required("Выберите мастеров"),
    executionDate: Yup.string().required("Укажите дату выполнения"),
    orderCost: Yup.number().typeError("Введите стоимость заказа").required("Введите стоимость заказа").min(0, "Стоимость не может быть отрицательной"),
    executionTimeByMaster: Yup.string().nullable().optional(),
});

const OrderForm: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [loading, setLoading] = useState(false);
    const [brands, setBrands] = useState<CarBrand[]>([]);
    const [models, setModels] = useState<CarModel[]>([]);
    const [workTypes, setWorkTypes] = useState<WorkType[]>([]);
    const [masters, setMasters] = useState<User[]>([]);
    const [modelsLoading, setModelsLoading] = useState(false);

    const {
        control,
        handleSubmit,
        register,
        reset,
        watch,
        setValue,
        formState: { errors },
    } = useForm<OrderFormValues>({
        resolver: yupResolver(schema),
        defaultValues: {
            clientName: "",
            clientPhone: "",
            carBrand: "",
            carModel: "",
            vin: "",
            workTypeIds: [],
            masterIds: [],
            executionDate: "",
            orderCost: 0,
            executionTimeByMaster: "",
        } as OrderFormValues,
    });

    const selectedBrandId = watch("carBrand");
    const selectedMasterIds = watch("masterIds");

    useEffect(() => {
        const loadBrands = async () => {
            try {
                const response = await orderAPI.getCarBrands();
                const data = await response.data;
                console.log("Результаты марок:", data);

                const carBrands = data
                    .filter((brand: any) => brand.name)
                    .map((brand: any) => ({
                        id: brand.id?.toString(), // ✅ Гарантируем строковый ID
                        name: brand.name
                    }))
                    .sort((a: CarBrand, b: CarBrand) => a.name.localeCompare(b.name));

                console.log("Обработанные марки:", carBrands);
                setBrands(carBrands);
            } catch (error) {
                console.error("Ошибка загрузки марок:", error);
                setBrands([
                    { id: "1", name: "Audi" },
                    { id: "2", name: "BMW" },
                    { id: "3", name: "Mercedes-Benz" },
                ]);
            }
        };
        loadBrands();
    }, []);

    useEffect(() => {
        const loadModels = async () => {
            if (!selectedBrandId) {
                setModels([]);
                setValue("carModel", "");
                return;
            }
            setModelsLoading(true);
            try {
                const response = await orderAPI.getCarModel(selectedBrandId);
                const data = await response.data;

                const carModels = data
                    .filter((model: any) => model.name)
                    .map((model: any) => ({
                        id: model.id.toString(), // ✅ Гарантируем строковый ID
                        name: model.name,
                        brand_id: selectedBrandId
                    }))
                    .sort((a: CarModel, b: CarModel) => a.name.localeCompare(b.name));
                setModels(carModels);

            } catch (error) {
                console.error("Ошибка загрузки моделей:", error);
                setModels([
                    { id: "1", name: "Model 1", brand_id: selectedBrandId },
                    { id: "2", name: "Model 2", brand_id: selectedBrandId },
                ]);
            } finally {
                setModelsLoading(false);
            }
        };
        loadModels();
    }, [selectedBrandId, setValue]);

    useEffect(() => {
        orderAPI.getDictionaryByType("WORK_TYPE").then((res) => {
            setWorkTypes(res.data);
        });
        userAPI.getUsersByRole("MASTER").then((res) => {
            const mastersData = Array.isArray(res.data) ? res.data : [res.data];
            setMasters(mastersData);
        }).catch((error) => {
            console.error("Ошибка загрузки мастеров:", error);
            setMasters([]);
        });
    }, []);

    useEffect(() => {
        const loadOrder = async () => {
            if (!id) return;
            setLoading(true);
            try {
                const response = await orderAPI.getById(id);
                const order: Order = response.data;

                reset({
                    clientName: order.clientName || "",
                    clientPhone: order.clientPhone || "",
                    carBrand: order.carBrand?.id?.toString() || "", // ✅ Преобразуем number в string
                    carModel: order.carModel?.id?.toString() || "", // ✅ Преобразуем number в string
                    vin: order.vin || "",
                    workTypeIds: order.workTypeIds || [],
                    masterIds: order.masterIds || [],
                    executionDate: order.executionDate
                        ? order.executionDate.slice(0, 16)
                        : "",
                    orderCost: order.orderCost || 0,
                    executionTimeByMaster: order.executionTimeByMaster || "",
                });
            } catch (e) {
                console.error("Ошибка загрузки заказа:", e);
            } finally {
                setLoading(false);
            }
        };
        loadOrder();
    }, [id, reset]);

    const onSubmit: SubmitHandler<OrderFormValues> = async (data) => {
        try {
            // Преобразуем ID в объекты для отправки
            const carBrandObj = brands.find(brand => brand.id === data.carBrand) || null;
            const carModelObj = models.find(model => model.id === data.carModel) || null;

            const dataToSend = {
                ...data,
                carBrand: carBrandObj,
                carModel: carModelObj,
                workTypeIds: data.workTypeIds || [],
                masterIds: data.masterIds || [],
            };
            if (!carBrandObj || !carModelObj) {
                alert("Пожалуйста, выберите марку и модель автомобиля.");
                return; // Останавливаем отправку формы, если марка или модель не выбраны
            }

            if (id) {
                await orderAPI.update(id, dataToSend);
                alert("Заказ обновлён!");
            } else {
                await orderAPI.create(dataToSend);
                alert("Заказ создан!");
            }
        } catch (error) {
            console.error("Ошибка сохранения:", error);
        }
    };

    const getMasterNames = (ids: number[] | undefined) => {
        if (!ids) return "";
        return ids.map(id => {
            const master = masters.find(m => m.id === id);
            return master ? `${master.firstName} ${master.lastName}` : `Мастер ${id}`;
        }).join(", ");
    };

    if (loading) return <p>Загрузка...</p>;

    return (
        <form onSubmit={handleSubmit(onSubmit as SubmitHandler<FieldValues>)} className="order-form">
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

            <div className="form-group">
                <select
                    {...register("carModel")}
                    disabled={!selectedBrandId || modelsLoading}
                    className={errors.carModel ? "error" : ""}
                >
                    <option value="">{modelsLoading ? "Загрузка моделей..." : "Выберите модель автомобиля"}</option>
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

            <div className="checkbox-group">
                <label>Тип работ:</label>
                <Controller
                    name="workTypeIds"
                    control={control}
                    render={({ field: { onChange, value } }) => (
                        <div className="checkbox-container">
                            {workTypes.map((workType) => (
                                <div key={workType.id} className="checkbox-item">
                                    <input
                                        type="checkbox"
                                        id={`work-type-${workType.id}`}
                                        value={workType.id}
                                        checked={value.includes(workType.id)}
                                        onChange={(e) => {
                                            const workTypeId = Number(e.target.value);
                                            const newWorkTypeIds = e.target.checked
                                                ? [...value, workTypeId]
                                                : value.filter((id) => id !== workTypeId);
                                            onChange(newWorkTypeIds);
                                        }}
                                    />
                                    <label htmlFor={`work-type-${workType.id}`}>
                                        {workType.name}
                                    </label>
                                </div>
                            ))}
                        </div>
                    )}
                />
                {errors.workTypeIds && (
                    <span className="error-text">{errors.workTypeIds.message}</span>
                )}
            </div>

            <div className="checkbox-group">
                <label>Мастера:</label>
                <Controller
                    name="masterIds"
                    control={control}
                    render={({ field: { onChange, value } }) => (
                        <div className="checkbox-container">
                            {masters.map((master) => (
                                <div key={master.id} className="checkbox-item">
                                    <input
                                        type="checkbox"
                                        id={`master-${master.id}`}
                                        value={master.id}
                                        checked={value.includes(master.id)}
                                        onChange={(e) => {
                                            const masterId = Number(e.target.value);
                                            const newMasterIds = e.target.checked
                                                ? [...value, masterId]
                                                : value.filter((id) => id !== masterId);
                                            onChange(newMasterIds);
                                        }}
                                    />
                                    <label htmlFor={`master-${master.id}`}>
                                        {master.firstName} {master.lastName}
                                    </label>
                                </div>
                            ))}
                        </div>
                    )}
                />
                {errors.masterIds && (
                    <span className="error-text">{errors.masterIds.message}</span>
                )}
            </div>

            {selectedMasterIds && selectedMasterIds.length > 0 && (
                <div className="selected-masters-display">
                    <p>Выбраны мастера: <strong>{getMasterNames(selectedMasterIds)}</strong></p>
                </div>
            )}

            <input
                type="datetime-local"
                {...register("executionDate")}
                className={errors.executionDate ? "error" : ""}
            />
            {errors.executionDate && (
                <span className="error-text">{errors.executionDate.message}</span>
            )}

            <input
                type="number"
                placeholder="Стоимость заказа"
                {...register("orderCost", { valueAsNumber: true })}
                className={errors.orderCost ? "error" : ""}
            />
            {errors.orderCost && (
                <span className="error-text">{errors.orderCost.message}</span>
            )}

            <input
                type="text"
                placeholder="Время выполнения (например, 2 часа)"
                {...register("executionTimeByMaster")}
                className={errors.executionTimeByMaster ? "error" : ""}
            />
            {errors.executionTimeByMaster && (
                <span className="error-text">{errors.executionTimeByMaster.message}</span>
            )}

            <button type="submit">Сохранить заказ</button>
        </form>
    );
};

export default OrderForm;
